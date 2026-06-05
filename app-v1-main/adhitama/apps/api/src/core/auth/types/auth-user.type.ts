/**
 * AuthUser — the shape of `request.user` after JwtStrategy validation.
 *
 * Attached to every authenticated request by Passport via JwtStrategy.validate().
 * Represents the VERIFIED identity of the caller — all fields are guaranteed
 * valid at the time of assignment.
 *
 * Design rules:
 *   - Minimal: only what downstream handlers need for authorization
 *   - No sensitive data: no passwordHash, tokens, or secrets
 *   - No profile data: no email, name, avatarUrl — fetch from DB if needed
 *   - No permissions: loaded on-demand by PermissionGuard (Phase 2.2.9)
 *   - No raw Prisma entity: purpose-built type, not a model shape
 *
 * Intentionally excluded fields:
 *   passwordHash       — never leaves the DB layer
 *   emailVerifiedAt    — security-sensitive; exposed as boolean to guards
 *   mustChangePassword — security-sensitive; exposed as boolean to guards
 *   permissions[]      — loaded from DB by PermissionGuard when needed
 *   avatarUrl / name   — presentation data; fetch from DB when needed
 *   status             — validated by JwtStrategy; valid session implies ACTIVE
 *   deletedAt          — validated by JwtStrategy; valid session implies non-deleted
 *
 * Future awareness:
 *   - emailVerifiedAt gating    : future guard checks this before certain operations
 *   - mustChangePassword gate   : future guard restricts endpoints until changed
 *   - MFA/TOTP                  : future `mfaVerified` flag may extend this type
 *   - Per-device revocation     : sessionId enables single-device logout now
 */
export interface AuthUser {
  /** Verified user ID. Matches users.id in the database. */
  id: string;
  /** Tenant ID. Every DB query must be scoped to this value. */
  tenantId: string;
  /**
   * Session ID. The specific Session row this request belongs to.
   * Used for: per-device logout, session listing, admin revocation.
   */
  sessionId: string;
  /** Role ID. Used by PermissionGuard to load role permissions from DB. */
  roleId: string;
  /** Whether the user must change their password before accessing protected routes. */
  mustChangePassword: boolean;
  /** Whether the user's email has been verified. */
  emailVerified: boolean;
}
