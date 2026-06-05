import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthConfig } from '@config/index';
import type { JwtPayload, SignPayload, TokenPair } from '../interfaces/jwt-payload.interface';

/**
 * TokenService — JWT access and refresh token infrastructure.
 *
 * Responsibilities:
 *   - Sign access tokens  (short-lived, stateless)
 *   - Sign refresh tokens (longer-lived, stateful via Session table)
 *   - Verify refresh tokens (signature + expiry only — NOT session state)
 *
 * NOT responsible for:
 *   - Access token verification → handled by JwtStrategy (Passport)
 *   - Session existence / revocation checks → handled by JwtStrategy
 *   - mustChangePassword enforcement → handled by AuthService
 *   - emailVerifiedAt gating → handled by AuthService / PermissionGuard
 *
 * Token design:
 *   - Access token  : signed with ACCESS_SECRET, short expiry (default 15m)
 *   - Refresh token : signed with REFRESH_SECRET, longer expiry (default 7d)
 *   - Distinct secrets: compromise of one does not compromise the other
 *   - Payload: { sub, tenantId, sessionId, roleId } — minimal, no profile data
 *
 * Security rules:
 *   - NEVER log tokens (access or refresh)
 *   - NEVER log the payload content
 *   - NEVER log secrets
 *   - NEVER expose raw jsonwebtoken errors to callers
 *   - Raw errors are logged internally for debugging; caller gets UnauthorizedException
 *
 * Future awareness:
 *   - Refresh token rotation: caller (AuthService) must revoke the Session row
 *     and create a new one on each successful refresh. TokenService only signs.
 *   - Session-based revocation: JwtStrategy validates sessionId against DB.
 *     Revoking a session invalidates all tokens that reference it.
 *   - mustChangePassword gating: AuthService checks this after verifying password.
 *     The token itself does NOT encode this flag.
 *   - emailVerifiedAt gating: will be enforced at PermissionGuard or AuthService
 *     level in a future phase. TokenService has no knowledge of this.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  /** Typed auth config — loaded once from ConfigService at construction */
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<AuthConfig>('auth');

    if (!config) {
      throw new Error(
        'Auth configuration not found. ' +
          'Ensure ConfigModule is loaded before TokenService.',
      );
    }

    this.authConfig = config;
  }

  // ─── Public API ────────────────────────────────────────────

  /**
   * Sign an access token.
   *
   * Short-lived and stateless — verified by JwtStrategy on every request.
   * Verification does NOT require a DB lookup (except the session check in strategy).
   *
   * @param payload - SignPayload: { sub, tenantId, sessionId, roleId }
   * @returns Signed JWT access token string.
   */
  signAccessToken(payload: SignPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.authConfig.accessTokenSecret,
      expiresIn: this.authConfig.accessTokenExpiresIn,
    });
  }

  /**
   * Sign a refresh token.
   *
   * Longer-lived and stateful — the raw token is NOT stored.
   * Caller (AuthService) must hash the token before storing in sessions table.
   * Session-based revocation is enforced by JwtStrategy on the access token flow.
   *
   * @param payload - SignPayload: { sub, tenantId, sessionId, roleId }
   * @returns Signed JWT refresh token string.
   */
  signRefreshToken(payload: SignPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.authConfig.refreshTokenSecret,
      expiresIn: this.authConfig.refreshTokenExpiresIn,
    });
  }

  /**
   * Sign both access and refresh tokens in a single call.
   *
   * Convenience method used at login and after refresh token rotation.
   * Both tokens share the same payload — they reference the same session.
   *
   * @param payload - SignPayload: { sub, tenantId, sessionId, roleId }
   * @returns TokenPair: { accessToken, refreshToken }
   */
  signTokenPair(payload: SignPayload): TokenPair {
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
    };
  }

  /**
   * Verify a refresh token's signature and expiry.
   *
   * This method ONLY checks the cryptographic validity of the token.
   * It does NOT check:
   *   - Whether the session is revoked (Session.revokedAt) → AuthService
   *   - Whether the session is expired in DB (Session.expiresAt) → AuthService
   *   - Whether the user is still active → AuthService
   *
   * Throws UnauthorizedException for any verification failure:
   *   - Invalid signature (tampered token)
   *   - Expired token (exp < now)
   *   - Malformed token (not a valid JWT)
   *
   * Raw jsonwebtoken errors are logged internally and never surfaced to callers.
   *
   * @param token - Raw refresh token string from the client.
   * @returns Typed JwtPayload if valid.
   * @throws UnauthorizedException if token is invalid for any reason.
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.authConfig.refreshTokenSecret,
      });

      return payload;
    } catch (error: unknown) {
      // Log internally for security monitoring — never surface to caller
      // Do NOT log the token itself
      this.logger.warn(
        'Refresh token verification failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
