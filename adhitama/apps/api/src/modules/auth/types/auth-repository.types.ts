/**
 * AuthRepository Return Types
 *
 * Defines typed shapes returned by AuthRepository methods.
 * These are purpose-built types — NOT Prisma model types.
 *
 * Design rules:
 *   - Only fields needed by auth consumers (AuthService, JwtStrategy)
 *   - No relations included (sessions, roles, auditLogs)
 *   - passwordHash included intentionally — AuthService needs it for verify()
 *   - nullable fields typed explicitly — callers handle null cases
 *
 * Consumer awareness:
 *   - AuthService.login() uses: id, tenantId, roleId, passwordHash,
 *     status, deletedAt, mustChangePassword, emailVerifiedAt
 *   - JwtStrategy uses: id, tenantId, roleId, status, deletedAt
 *     (but JwtStrategy queries directly — does NOT use AuthRepository)
 */

/**
 * UserForAuth — minimal user shape returned by AuthRepository.
 *
 * Contains exactly what login flow needs:
 *   - Identity fields for session and token creation
 *   - passwordHash for credential verification
 *   - Security flags (status, deletedAt, mustChangePassword, emailVerifiedAt)
 *
 * Explicitly excluded:
 *   - name, address, contact, avatarUrl — presentation data
 *   - lastLoginAt — updated by AuthService after successful login
 *   - createdAt, updatedAt — not needed in auth flow
 *   - All relations — never fetched in auth context
 */
export interface UserForAuth {
  id: string;
  tenantId: string;
  roleId: string;
  email: string;
  /** May be null for owner-type users who login via email only */
  nip: string | null;
  /**
   * Argon2id hash — only field where raw hash is intentionally exposed
   * to upper layer. AuthService.login() passes this to PasswordService.verify().
   * MUST NOT be logged, serialized to response, or stored elsewhere.
   */
  passwordHash: string;
  status: string;
  /** Non-null = soft deleted. AuthRepository always filters deletedAt: null. */
  deletedAt: Date | null;
  /**
   * Security flag — true = user must change password before full access.
   * AuthService reads this; JwtStrategy does not enforce it yet.
   */
  mustChangePassword: boolean;
  /**
   * Security flag — null = email not verified.
   * Future: certain operations may require non-null emailVerifiedAt.
   */
  emailVerifiedAt: Date | null;
}

export interface UserProfileForAuth {
  id: string;
  tenantId: string;
  roleId: string;
  name: string;
  email: string;
  nip: string | null;
  emailVerifiedAt: Date | null;
  mustChangePassword: boolean;
  avatarUrl: string | null;
  contact: string | null;
  address: string | null;
}
