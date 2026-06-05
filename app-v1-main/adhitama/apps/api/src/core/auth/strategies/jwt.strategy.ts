import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@infrastructure/prisma';
import type { AuthConfig } from '@config/index';
import type { RequestWithTenant } from '@common/types/request-tenant.type';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { AuthUser } from '../types/auth-user.type';

/**
 * JwtStrategy — Passport strategy for JWT access token validation.
 *
 * SINGLE SOURCE OF TRUTH for runtime authentication validation.
 * Every protected endpoint passes through this strategy via JwtAuthGuard.
 * Validation logic MUST NOT be duplicated in controllers or other guards.
 *
 * Validation pipeline (all must pass — ANY failure = generic 401):
 *   Step 1-2: Passport handles signature + expiry before calling validate()
 *   Step 3:   User exists (DB: id + tenantId)
 *   Step 4:   User deletedAt === null  (not soft-deleted)
 *   Step 5:   User status === 'ACTIVE' (not suspended or inactive)
 *   Step 6:   Session exists (DB: id + userId)
 *   Step 7:   Session revokedAt === null (not explicitly revoked)
 *   Step 8:   Session expiresAt > now() (not DB-expired)
 *
 * Query discipline:
 *   User    → SELECT id, tenantId, roleId, status, deletedAt,
 *             mustChangePassword, emailVerifiedAt
 *   Session → SELECT id, revokedAt, expiresAt ONLY
 *   No full entity. No relations. No permissions (Phase 2.2.9).
 *
 * Error discipline:
 *   ALL failures → generic UnauthorizedException (no detail to client)
 *   Reason logged internally at WARN level for security monitoring.
 *
 * Future awareness:
 *   - emailVerifiedAt gating    : enforced via SecurityPolicyGuard
 *   - mustChangePassword gate   : enforced via SecurityPolicyGuard
 *   - MFA/TOTP                  : future strategy extension or separate guard
 *   - Session device management : sessionId in AuthUser supports per-device revoke
 *
 * NOT responsible for:
 *   - Permission loading  → PermissionGuard (Phase 2.2.9)
 *   - Refresh token check → TokenService.verifyRefreshToken()
 *   - mustChangePassword  → future enforcement guard
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
  ) {
    const authConfig = configService.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error(
        'Auth configuration not found. ' +
          'Ensure ConfigModule is loaded before JwtStrategy.',
      );
    }

    super({
      // Extract Bearer token from Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens before validate() is called
      ignoreExpiration: false,
      // Access token secret — distinct from refresh token secret
      secretOrKey: authConfig.accessTokenSecret,
      // Pass the Express request into validate() so we can enforce
      // request-level tenant consistency against the token payload.
      passReqToCallback: true,
    });
  }

  /**
   * Called by Passport after token signature + expiry are verified (steps 1-2).
   * Performs DB-level validation for steps 3-8.
   *
   * Returns AuthUser → Passport attaches it to request.user.
   * Generic UnauthorizedException for ANY failure — no detail exposed.
   */
  async validate(
    req: RequestWithTenant,
    payload: JwtPayload,
  ): Promise<AuthUser> {
    const { sub: userId, tenantId, sessionId } = payload;

    if (!req.tenant || req.tenant.tenantId !== tenantId) {
      this.logger.warn(
        `Auth failed: tenant mismatch — userId=${userId}, tokenTenant=${tenantId}, requestTenant=${req.tenant?.tenantId ?? 'missing'}`,
      );
      throw new UnauthorizedException();
    }

    // ── Step 3-5: Validate User ────────────────────────────
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        tenantId: true,
        roleId: true,
        status: true,
        deletedAt: true,
        mustChangePassword: true,
        emailVerifiedAt: true,
      },
    });

    // Step 3: user must exist
    if (!user) {
      this.logger.warn(`Auth failed: user not found — userId=${userId}`);
      throw new UnauthorizedException();
    }

    // Step 4: user must not be soft-deleted
    if (user.deletedAt !== null) {
      this.logger.warn(`Auth failed: user deleted — userId=${userId}`);
      throw new UnauthorizedException();
    }

    // Step 5: user must be ACTIVE (not INACTIVE or SUSPENDED)
    if (user.status !== 'ACTIVE') {
      this.logger.warn(
        `Auth failed: user not active — userId=${userId}, status=${user.status}`,
      );
      throw new UnauthorizedException();
    }

    // ── Step 6-8: Validate Session ────────────────────────
    const session = await this.prismaService.session.findFirst({
      where: { id: sessionId, userId, tenantId },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    // Step 6: session must exist
    if (!session) {
      this.logger.warn(
        `Auth failed: session not found — sessionId=${sessionId}, userId=${userId}`,
      );
      throw new UnauthorizedException();
    }

    // Step 7: session must not be revoked
    if (session.revokedAt !== null) {
      this.logger.warn(`Auth failed: session revoked — sessionId=${sessionId}`);
      throw new UnauthorizedException();
    }

    // Step 8: session must not be DB-expired
    if (session.expiresAt < new Date()) {
      this.logger.warn(`Auth failed: session expired — sessionId=${sessionId}`);
      throw new UnauthorizedException();
    }

    // ── All checks passed — return minimal AuthUser ───────
    // No sensitive fields. No profile data. No permissions.
    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenantId,
      sessionId: session.id,
      roleId: user.roleId,
      mustChangePassword: user.mustChangePassword,
      emailVerified: user.emailVerifiedAt !== null,
    };

    return authUser;
  }
}
