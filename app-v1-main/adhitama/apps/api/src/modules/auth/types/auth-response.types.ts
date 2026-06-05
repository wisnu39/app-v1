/**
 * AuthService Response Types
 *
 * Explicit typed response shapes returned by AuthService methods.
 * These are the ONLY shapes that leave the auth service layer.
 *
 * Design rules:
 *   - No Prisma entity types
 *   - No passwordHash — never exposed beyond PasswordService
 *   - No raw session objects
 *   - No internal repository types
 *   - mustChangePassword is explicit in response — not in JWT payload
 */

/**
 * AuthUserResponse — minimal user info in auth responses.
 *
 * Intentionally omits:
 *   - passwordHash       : never leaves auth layer
 *   - emailVerifiedAt    : security-sensitive; available on /me endpoint
 *   - deletedAt          : internal status; not for client
 *   - lastLoginAt        : updated internally; not needed in login response
 *   - address / contact  : profile data; fetch from /me or profile endpoint
 *   - avatarUrl          : presentation data; fetch from profile endpoint
 */
export interface AuthUserResponse {
  id: string;
  tenantId: string;
  roleId: string;
  email: string;
  /** Null for owner accounts that login via email only */
  nip: string | null;
  /**
   * Security flag — when true, client MUST redirect to change-password page.
   * Enforcement (blocking other endpoints) is deferred to a future guard.
   * AuthService includes this explicitly so the client can act on it.
   */
  mustChangePassword: boolean;
}

/**
 * AuthTokensResponse — token pair returned on login and refresh.
 *
 * accessToken  : short-lived JWT, stateless verification
 * refreshToken : longer-lived JWT, stateful (validated against sessions table)
 *
 * IMPORTANT: caller must store refreshToken securely.
 * It is NOT returned after refresh — the new token pair replaces it entirely.
 */
export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * LoginResponse — full response shape for successful login.
 *
 * Combines token pair with minimal user info.
 * mustChangePassword determines whether the client should restrict navigation.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

/**
 * RefreshResponse — response shape for successful token refresh.
 *
 * User info is omitted — client already has it from login.
 * Only new token pair is returned.
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
