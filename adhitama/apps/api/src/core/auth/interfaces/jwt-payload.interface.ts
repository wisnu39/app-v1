/**
 * JwtPayload — the data encoded inside every JWT issued by this system.
 *
 * Design rules:
 *   - MINIMAL: only what is absolutely needed for request authorization
 *   - NO profile data (email, name, avatarUrl, contact)
 *   - NO permissions array (loaded from DB at request time via PermissionGuard)
 *   - NO status flags (mustChangePassword, emailVerifiedAt)
 *     → these are checked at the service layer, not baked into the token
 *   - NO role name (roleId is enough; name is presentation data)
 *
 * Fields:
 *   sub       — User ID (standard JWT "subject" claim)
 *   tenantId  — Tenant ID for multi-tenant isolation
 *   sessionId — Session row ID; validated against Session table on every request
 *               to support revocation without token blacklist
 *   roleId    — Role ID; used by PermissionGuard to load permissions from DB
 *
 * Future awareness (not implemented here):
 *   - sessionId enables: refresh token rotation, logout-all, admin revocation
 *   - roleId enables: PermissionGuard DB lookup without extra session join
 *   - mustChangePassword check: done in AuthService at login time, not in token
 *   - emailVerifiedAt gate: done at service layer, not in token
 */
export interface JwtPayload {
  /** User ID — standard JWT 'sub' claim */
  sub: string;
  /** Tenant ID — required for every multi-tenant data access check */
  tenantId: string;
  /**
   * Session ID — the specific Session row this token belongs to.
   * JwtStrategy validates this against the sessions table on every request.
   * Enables stateful revocation without Redis token blacklist.
   */
  sessionId: string;
  /** Role ID — used by PermissionGuard to load role permissions from DB */
  roleId: string;
  /** Issued-at timestamp (Unix seconds) — added by jsonwebtoken automatically */
  iat?: number;
  /** Expiry timestamp (Unix seconds) — added by jsonwebtoken automatically */
  exp?: number;
}

/**
 * TokenPair — the result of a successful sign operation (login or refresh).
 * Both tokens are returned together and must be treated as a unit.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * SignPayload — the input shape for token signing.
 * Excludes JWT standard claims (iat, exp) which are added automatically.
 */
export type SignPayload = Omit<JwtPayload, 'iat' | 'exp'>;
