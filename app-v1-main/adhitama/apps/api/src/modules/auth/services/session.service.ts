import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '@infrastructure/password';
import { SessionRepository } from '../repositories/session.repository';
import type { AuthConfig } from '@config/index';
import type { SessionRecord } from '../types/session-repository.types';

/**
 * CreateSessionParams — input for SessionService.createSession().
 *
 * raw refreshToken is accepted here — SessionService hashes it before
 * passing to SessionRepository. Raw token is never stored or logged.
 */
export interface CreateSessionParams {
  /** Optional pre-generated session ID for token-session sync (see AuthService) */
  id?: string;
  userId: string;
  tenantId: string;
  /** Raw refresh token — will be hashed by SessionService. NEVER stored raw. */
  rawRefreshToken: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * RevokeSessionParams — input for SessionService.revokeSession().
 * userId is required for ownership scoping — prevents arbitrary revocation.
 */
export interface RevokeSessionParams {
  sessionId: string;
  userId: string;
  tenantId: string;
}

/**
 * SessionService — session lifecycle management.
 *
 * Responsibilities:
 *   - Create sessions on login or refresh token rotation
 *     (hash raw token → compute expiresAt → persist)
 *   - Revoke a single session (single-device logout)
 *   - Revoke all sessions for a user (logout-all, password change, suspension)
 *
 * NOT responsible for:
 *   - JWT signing/verification → TokenService (core/auth)
 *   - Login orchestration     → AuthService (Phase 2.2.7)
 *   - Session validation      → JwtStrategy (validates per-request)
 *   - Refresh token rotation  → AuthService (orchestrates full flow)
 *
 * Token security rules:
 *   - raw refreshToken accepted in createSession() for hashing
 *   - Hash is computed via PasswordService.hash() — same Argon2id pipeline
 *   - Raw token is discarded after hashing — never logged or returned
 *   - Only the hash is persisted in the sessions table
 *
 * Future awareness:
 *   - Multi-device management: sessionId per device; list active sessions
 *     for a user to support "active sessions" UI (needs new repository method)
 *   - Trusted device: future flag on Session model for remember-me flows
 *   - Session activity tracking: lastUsedAt update on each token refresh
 *   - Device fingerprinting: enhanced deviceInfo parsing for anomaly detection
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  /** Cached auth config — loaded once at construction */
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<AuthConfig>('auth');

    if (!config) {
      throw new Error(
        'Auth configuration not found. ' +
          'Ensure ConfigModule is loaded before SessionService.',
      );
    }

    this.authConfig = config;
  }

  // ─── Public API ────────────────────────────────────────────

  /**
   * Create a new session for a user.
   *
   * Flow:
   *   1. Hash the raw refresh token via PasswordService (Argon2id)
   *   2. Compute expiresAt from JWT_REFRESH_EXPIRES_IN config
   *   3. Persist via SessionRepository
   *
   * Raw token is discarded after hashing — never logged, never returned.
   * Caller (AuthService) retains the raw token to return to the client.
   *
   * @returns SessionRecord of the created session (no hash exposed)
   */
  async createSession(params: CreateSessionParams): Promise<SessionRecord> {
    const { userId, tenantId, rawRefreshToken, deviceInfo, ipAddress, userAgent } =
      params;

    // Step 1: Hash the raw refresh token
    // Using PasswordService (Argon2id) — same pipeline as password hashing.
    // Raw token is discarded after this line.
    const refreshTokenHash = await this.passwordService.hash(rawRefreshToken);

    // Step 2: Compute session expiry from config
    const expiresAt = this.computeExpiresAt(
      this.authConfig.refreshTokenExpiresIn,
    );

    // Step 3: Persist — only hash is stored, never raw token
    const session = await this.sessionRepository.create({
      ...(params.id ? { id: params.id } : {}),
      userId,
      tenantId,
      refreshTokenHash,
      expiresAt,
      deviceInfo: deviceInfo ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    this.logger.log(
      `Session created — userId=${userId}, sessionId=${session.id}`,
    );

    return session;
  }

  /**
   * Revoke a single session (single-device logout).
   *
   * Scoped by both sessionId and userId — prevents cross-user revocation
   * even if called with an arbitrary sessionId.
   *
   * @param params - { sessionId, userId }
   */
  async revokeSession(params: RevokeSessionParams): Promise<void> {
    const { sessionId, userId, tenantId } = params;

    await this.sessionRepository.revoke(sessionId, userId, tenantId);

    this.logger.log(`Session revoked — sessionId=${sessionId}, userId=${userId}`);
  }

  /**
   * Revoke ALL sessions for a user (logout-all).
   *
   * Scoped by both userId and tenantId — prevents cross-tenant impact.
   * Called on: logout-all, password change, admin suspension.
   *
   * @param userId   - User whose sessions to revoke
   * @param tenantId - Tenant scope — safety boundary
   * @returns Number of sessions revoked
   */
  async revokeAllSessions(
    userId: string,
    tenantId: string,
  ): Promise<number> {
    const count = await this.sessionRepository.revokeAll(userId, tenantId);

    this.logger.log(
      `All sessions revoked — userId=${userId}, count=${count}`,
    );

    return count;
  }

  /**
   * Verify ownership of a refresh token before rotation.
   *
   * This protects against stolen/old refresh tokens by checking:
   *   1) session exists and is active
   *   2) raw refresh token matches the stored hash
   *   3) stale or revoked sessions trigger logout-all
   *
   * @param rawRefreshToken - Raw refresh token presented by the client
   * @param sessionId        - Session ID embedded in the token payload
   * @param userId           - User ID embedded in the token payload
   * @param tenantId         - Tenant ID embedded in the token payload
   * @returns Active SessionRecord when ownership is validated
   */
  async verifyRefreshTokenOwnership(
    rawRefreshToken: string,
    sessionId: string,
    userId: string,
    tenantId: string,
  ): Promise<SessionRecord> {
    const activeSession = await this.sessionRepository.findActiveSessionById(
      sessionId,
      userId,
      tenantId,
    );

    if (!activeSession) {
      const staleSession = await this.sessionRepository.findSessionById(
        sessionId,
        userId,
        tenantId,
      );

      if (staleSession) {
        this.logger.warn(
          `Refresh replay or stale session used — userId=${userId}, sessionId=${sessionId}`,
        );
        await this.sessionRepository.revokeAll(userId, tenantId);
      }

      throw new UnauthorizedException(
        'Refresh token is invalid or has already been used.',
      );
    }

    const tokenMatches = await this.passwordService.verify(
      rawRefreshToken,
      activeSession.refreshTokenHash,
    );

    if (!tokenMatches) {
      this.logger.warn(
        `Refresh replay detected — userId=${userId}, sessionId=${sessionId}`,
      );

      await this.sessionRepository.revokeAll(userId, tenantId);

      throw new UnauthorizedException(
        'Refresh token is invalid or has already been used.',
      );
    }

    return activeSession;
  }

  /**
   * Rotate an existing session atomically.
   *
   * The old session is revoked and the replacement session is created in a
   * single database transaction. Concurrent refresh attempts cannot both
   * succeed because the old session is only revoked once.
   *
   * @param oldSessionId    - Existing session being rotated
   * @param userId          - User scope
   * @param tenantId        - Tenant scope
   * @param newSessionId    - Replacement session ID
   * @param rawRefreshToken - Raw refresh token for the replacement session
   */
  async rotateSession(
    oldSessionId: string,
    userId: string,
    tenantId: string,
    newSessionId: string,
    rawRefreshToken: string,
    deviceInfo?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<SessionRecord> {
    const refreshTokenHash = await this.passwordService.hash(rawRefreshToken);
    const expiresAt = this.computeExpiresAt(
      this.authConfig.refreshTokenExpiresIn,
    );

    const rotatedSession = await this.sessionRepository.revokeSessionChain(
      oldSessionId,
      userId,
      tenantId,
      {
        id: newSessionId,
        userId,
        tenantId,
        refreshTokenHash,
        expiresAt,
        deviceInfo: deviceInfo ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    );

    if (!rotatedSession) {
      this.logger.warn(
        `Concurrent refresh detected — userId=${userId}, sessionId=${oldSessionId}`,
      );

      await this.sessionRepository.revokeAll(userId, tenantId);

      throw new UnauthorizedException(
        'Refresh token is invalid or has already been used.',
      );
    }

    this.logger.log(
      `Session rotated — userId=${userId}, oldSessionId=${oldSessionId}, newSessionId=${newSessionId}`,
    );

    return rotatedSession;
  }

  // ─── Private Helpers ─────────────────────────────────────

  /**
   * Parse a JWT expiry string and compute an absolute Date.
   *
   * Supports: {n}s (seconds), {n}m (minutes), {n}h (hours), {n}d (days)
   * Validated by Joi at bootstrap — format is guaranteed to match /^\d+[smhd]$/
   *
   * No external date library — pure arithmetic.
   *
   * @param expiry - e.g. '15m', '7d', '1h', '3600s'
   * @returns Date representing now + expiry duration
   */
  private computeExpiresAt(expiry: string): Date {
    const unit = expiry.slice(-1) as 's' | 'm' | 'h' | 'd';
    const value = parseInt(expiry.slice(0, -1), 10);

    const multipliers: Record<typeof unit, number> = {
      s: 1_000,
      m: 60 * 1_000,
      h: 60 * 60 * 1_000,
      d: 24 * 60 * 60 * 1_000,
    };

    const multiplier = multipliers[unit];

    if (!multiplier || isNaN(value) || value <= 0) {
      // This should never happen — Joi validates the format at bootstrap.
      // Log and fall back to a safe 7-day default rather than crashing.
      this.logger.error(
        `Invalid refresh token expiry format: "${expiry}". ` +
          'Falling back to 7d. Check JWT_REFRESH_EXPIRES_IN env var.',
      );
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
    }

    return new Date(Date.now() + value * multiplier);
  }
}
