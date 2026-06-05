import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordService } from '@infrastructure/password';
import { TokenService } from '@core/auth';
import type { TokenPair } from '@core/auth';
import { AUDIT_EVENT } from '@modules/audit/constants';
import { AuditService } from '@modules/audit/services';
import { SessionService } from './session.service';
import { AuthSecurityService } from './auth-security.service';
import { AuthRepository } from '../repositories/auth.repository';

// ─── Response DTOs ────────────────────────────────────────────

/**
 * AuthUserResponse — user fields returned inside auth responses.
 *
 * Explicit DTO shape — NOT a Prisma entity.
 * Excluded: passwordHash, deletedAt, emailVerifiedAt, raw DB fields.
 * mustChangePassword included so frontend can redirect immediately.
 */
export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  /** Null for owner accounts (no NIP required) */
  nip: string | null;
  roleId: string;
  /** When true: frontend MUST redirect to change-password before app access */
  mustChangePassword: boolean;
}

/** Full login response including token pair and user display info */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

/** Refresh response — new token pair only (no user data needed) */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}


/** Response for GET /auth/me — onboarding + security state */
export interface MeResponse {
  id: string;
  name: string;
  email: string;
  /** Null for owner accounts */
  nip: string | null;
  roleId: string;
  tenantId: string;
  /** Derived from emailVerifiedAt !== null — raw timestamp not exposed */
  emailVerified: boolean;
  /**
   * Derived: name && email && contact && address all present.
   * avatarUrl is optional. nip not required for owners.
   */
  profileCompleted: boolean;
  mustChangePassword: boolean;
  avatarUrl: string | null;
}

// ─── Input Types ──────────────────────────────────────────────

export interface LoginInput {
  /**
   * Email or NIP — type detected by '@' presence.
   * Contains '@' → email. Otherwise → NIP.
   */
  identifier: string;
  password: string;
  tenantId: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RefreshInput {
  rawRefreshToken: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AuditRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

/**
 * AuthService — authentication orchestration layer.
 *
 * Responsibilities:
 *   - login()       : resolve identifier → validate → sign tokens → create session
 *   - refreshTokens(): verify → rotate session → sign new tokens
 *   - logout()      : revoke current session
 *   - logoutAll()   : revoke all user sessions
 *
 * NOT responsible for:
 *   - Database access     → AuthRepository, PrismaService (lastLoginAt + name only)
 *   - Password hashing    → PasswordService
 *   - JWT signing/verify  → TokenService
 *   - Session lifecycle   → SessionService
 *   - HTTP concerns       → AuthController (Phase 2.2.8)
 *   - RBAC               → PermissionGuard (Phase 2.2.9)
 *
 * Token ↔ Session sync strategy:
 *   Pre-generate a sessionId (crypto.randomUUID) BEFORE signing the JWT.
 *   Sign the JWT with this pre-generated sessionId.
 *   Create session row passing the pre-generated ID explicitly.
 *   Result: single sign, single hash, no double-update.
 *
 * Identifier detection:
 *   identifier.includes('@') → email → AuthRepository.findByEmail()
 *   otherwise               → NIP   → AuthRepository.findByNip()
 *
 * Generic failure policy:
 *   ALL login failures → UnauthorizedException() with no detail.
 *   Internal reason logged at WARN for security monitoring.
 *
 * Audit events emitted from this service:
 *   LOGIN_SUCCESS : after session created + tokens signed
 *   LOGIN_FAILED  : at each failure point in login()
 *   LOGOUT        : after session revoked
 *   LOGOUT_ALL    : after all sessions revoked
 *   TOKEN_REFRESH : after token rotation succeeds
 *
 * emailVerifiedAt awareness:
 *   NOT blocking login currently. Future phase may add:
 *     - Login block for unverified accounts
 *     - Sensitive operation gating via EmailVerifiedGuard
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Login ─────────────────────────────────────────────────

  /**
   * login() — full login orchestration.
   *
   * Step order is strict — do not reorder:
   *   1. Detect identifier type
   *   2. Find user
   *   3. Validate user exists
   *   4. Validate status === ACTIVE
   *   5. Validate password
   *   6. Pre-generate sessionId
   *   7. Sign token pair (uses pre-generated sessionId)
   *   8. Create session (stores hash of raw refresh token)
   *   9. Update lastLoginAt (fire-and-forget)
   *  10. Return LoginResponse DTO
   */
  async login(input: LoginInput): Promise<LoginResponse> {
    const { identifier, password, tenantId, deviceInfo, ipAddress, userAgent } =
      input;

    await this.authSecurityService.preflightLogin({
      identifier,
      tenantId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    // ── Step 1: Detect identifier type ─────────────────────
    const isEmail = identifier.includes('@');

    // ── Step 2: Find user ───────────────────────────────────
    const user = isEmail
      ? await this.authRepository.findByEmail(identifier, tenantId)
      : await this.authRepository.findByNip(identifier, tenantId);

    // ── Step 3: Validate user exists ────────────────────────
    if (!user) {
      this.logger.warn(
        `Login failed: not found — ` +
          `type=${isEmail ? 'email' : 'nip'}, tenantId=${tenantId}`,
      );
      await this.authSecurityService.recordLoginFailure({
        identifier,
        tenantId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      this.auditService.fireAndForget({
        tenantId,
        action: AUDIT_EVENT.LOGIN_FAILED,
        entityType: 'User',
        entityId: identifier,
        metadata: {
          identifier,
          reason: 'not_found',
          authMethod: isEmail ? 'email' : 'nip',
          deviceInfo: deviceInfo ?? null,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new UnauthorizedException();
    }

    // ── Step 4: Validate status === ACTIVE ──────────────────
    // deletedAt is always null (filtered by AuthRepository)
    // emailVerifiedAt: not blocking yet — see class-level comment
    if (user.status !== 'ACTIVE') {
      this.logger.warn(
        `Login failed: not active — userId=${user.id}, status=${user.status}`,
      );
      await this.authSecurityService.recordLoginFailure({
        identifier,
        tenantId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      this.auditService.fireAndForget({
        tenantId,
        action: AUDIT_EVENT.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          identifier,
          reason: 'not_active',
          status: user.status,
          authMethod: isEmail ? 'email' : 'nip',
          deviceInfo: deviceInfo ?? null,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new UnauthorizedException();
    }

    // ── Step 5: Validate password ───────────────────────────
    const passwordValid = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!passwordValid) {
      this.logger.warn(`Login failed: bad credentials — userId=${user.id}`);
      await this.authSecurityService.recordLoginFailure({
        identifier,
        tenantId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      this.auditService.fireAndForget({
        tenantId,
        action: AUDIT_EVENT.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          identifier,
          reason: 'bad_credentials',
          authMethod: isEmail ? 'email' : 'nip',
          deviceInfo: deviceInfo ?? null,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new UnauthorizedException();
    }

    // ── Step 6: Pre-generate sessionId ─────────────────────
    // crypto.randomUUID() is built into Node 18+ — no import needed.
    // Pre-generating allows us to sign the JWT before the DB insert,
    // then pass the same ID to SessionRepository for an explicit insert.
    // Result: single JWT sign, single Argon2id hash, no update needed.
    const preSessionId = crypto.randomUUID();

    // ── Step 7: Sign token pair ─────────────────────────────
    const tokenPair: TokenPair = this.tokenService.signTokenPair({
      sub: user.id,
      tenantId: user.tenantId,
      sessionId: preSessionId,
      roleId: user.roleId,
    });

    // ── Step 8: Create session ──────────────────────────────
    // SessionService hashes tokenPair.refreshToken and stores the hash.
    // The pre-generated ID ensures DB row matches the JWT sessionId.
    await this.sessionService.createSession({
      id: preSessionId,
      userId: user.id,
      tenantId: user.tenantId,
      rawRefreshToken: tokenPair.refreshToken,
      deviceInfo: deviceInfo ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    await this.authSecurityService.recordLoginSuccess({
      identifier,
      tenantId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    this.auditService.fireAndForget({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: AUDIT_EVENT.LOGIN_SUCCESS,
      entityType: 'User',
      entityId: user.id,
      sessionId: preSessionId,
      metadata: {
        identifier,
        authMethod: isEmail ? 'email' : 'nip',
        deviceInfo: deviceInfo ?? null,
      },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    // ── Step 9: Update lastLoginAt (fire-and-forget) ────────
    void this.authRepository
      .updateLastLogin(user.id, user.tenantId)
      .catch((err: unknown) => {
        this.logger.error(
          `lastLoginAt update failed — userId=${user.id}: ` +
            (err instanceof Error ? err.message : String(err)),
        );
      });

    // AUDIT POINT: LOGIN_SUCCESS — userId, sessionId, tenantId, ipAddress

    this.logger.log(
      `Login success — userId=${user.id}, sessionId=${preSessionId}`,
    );

    // ── Step 10: Fetch name + return DTO ───────────────────
    // name is not in UserForAuth (presentation field, not auth field)
    const displayUser = await this.authRepository.findProfileById(
      user.id,
      user.tenantId,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        name: displayUser?.name ?? '',
        email: user.email,
        nip: user.nip,
        roleId: user.roleId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // ─── Refresh Token Rotation ─────────────────────────────────

  /**
   * refreshTokens() — refresh token rotation.
   *
   * Steps:
   *   1. Verify refresh token (signature + expiry)
   *   2. Revoke old session
   *   3. Pre-generate new sessionId
   *   4. Sign new token pair (with new sessionId)
   *   5. Create new session (stores hash of new refresh token)
   *   6. Return RefreshResponse
   */
  async refreshTokens(input: RefreshInput): Promise<RefreshResponse> {
    const { rawRefreshToken, deviceInfo, ipAddress, userAgent } = input;

    await this.authSecurityService.preflightRefresh({
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    try {
      // ── Step 1: Verify ──────────────────────────────────────
      const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);

      // ── Step 2: Validate ownership of the raw refresh token before rotation ──
      await this.sessionService.verifyRefreshTokenOwnership(
        rawRefreshToken,
        payload.sessionId,
        payload.sub,
        payload.tenantId,
      );

      // ── Step 3: Pre-generate new sessionId ─────────────────
      const newSessionId = crypto.randomUUID();

      // ── Step 4: Sign new token pair ─────────────────────────
      const newPair: TokenPair = this.tokenService.signTokenPair({
        sub: payload.sub,
        tenantId: payload.tenantId,
        sessionId: newSessionId,
        roleId: payload.roleId,
      });

      // ── Step 5: Atomically revoke and create session ─────────
      await this.sessionService.rotateSession(
        payload.sessionId,
        payload.sub,
        payload.tenantId,
        newSessionId,
        newPair.refreshToken,
        deviceInfo ?? null,
        ipAddress ?? null,
        userAgent ?? null,
      );

      await this.authSecurityService.recordRefreshSuccess({
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });

      this.auditService.fireAndForget({
        tenantId: payload.tenantId,
        actorUserId: payload.sub,
        action: AUDIT_EVENT.TOKEN_REFRESH,
        entityType: 'Session',
        entityId: newSessionId,
        sessionId: newSessionId,
        metadata: {
          previousSessionId: payload.sessionId,
          deviceInfo: deviceInfo ?? null,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });

      this.logger.log(
        `Token rotation — userId=${payload.sub}, ` +
          `old=${payload.sessionId}, new=${newSessionId}`,
      );

      return {
        accessToken: newPair.accessToken,
        refreshToken: newPair.refreshToken,
      };
    } catch (error) {
      await this.authSecurityService.recordRefreshFailure({
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw error;
    }
  }

  // ─── Logout ─────────────────────────────────────────────────

  /**
   * logout() — revoke current session only.
   * @param sessionId - From request.user (AuthUser via JwtAuthGuard)
   * @param userId    - From request.user
   */
  async logout(
    sessionId: string,
    userId: string,
    tenantId: string,
    auditContext?: AuditRequestContext,
  ): Promise<void> {
    await this.sessionService.revokeSession({ sessionId, userId, tenantId });

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: userId,
      action: AUDIT_EVENT.LOGOUT,
      entityType: 'Session',
      entityId: sessionId,
      sessionId,
      metadata: {
        sessionsRevoked: 1,
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    this.logger.log(`Logout — userId=${userId}, sessionId=${sessionId}`);
  }

  /**
   * logoutAll() — revoke ALL active sessions for this user.
   * @param userId   - From request.user
   * @param tenantId - From request.user
   * @returns Count of revoked sessions
   */
  async logoutAll(
    userId: string,
    tenantId: string,
    auditContext?: AuditRequestContext,
  ): Promise<number> {
    const count = await this.sessionService.revokeAllSessions(userId, tenantId);

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: userId,
      action: AUDIT_EVENT.LOGOUT_ALL,
      entityType: 'Session',
      entityId: userId,
      sessionId: auditContext?.sessionId ?? null,
      metadata: {
        sessionsRevoked: count,
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    this.logger.log(`Logout all — userId=${userId}, revoked=${count}`);
    return count;
  }
  // ─── Me ──────────────────────────────────────────────────────

  /**
   * getMe() — fetch current user's profile + security state for GET /auth/me.
   *
   * Fetches minimal fields needed for onboarding state.
   * Computes derived boolean fields (emailVerified, profileCompleted).
   * Does NOT expose raw emailVerifiedAt — only derived boolean.
   *
   * @param userId   - From AuthUser (request.user.id via JwtAuthGuard)
   * @param tenantId - From AuthUser
   */
  async getMe(userId: string, tenantId: string): Promise<MeResponse> {
    const user = await this.authRepository.findProfileById(
      userId,
      tenantId,
    );

    if (!user) {
      // Should not happen — JwtStrategy already validated the user exists.
      // Guard against race condition (user deleted between strategy + handler).
      const { UnauthorizedException } = await import('@nestjs/common');
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      nip: user.nip,
      roleId: user.roleId,
      tenantId: user.tenantId,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerifiedAt !== null,
      profileCompleted: this.computeProfileCompleted(user),
      mustChangePassword: user.mustChangePassword,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * computeProfileCompleted — derives onboarding completion state.
   *
   * Required for all users: name, email, contact, address.
   * avatarUrl is optional.
   * nip is not required for owner accounts.
   *
   * Logic is server-side — frontend should not compute this.
   */
  private computeProfileCompleted(user: {
    name: string;
    email: string;
    contact: string | null;
    address: string | null;
  }): boolean {
    return (
      !!user.name &&
      !!user.email &&
      !!user.contact &&
      !!user.address
    );
  }
}
