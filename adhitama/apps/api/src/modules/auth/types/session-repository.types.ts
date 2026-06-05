/**
 * SessionRepository Types
 *
 * Input and return shapes for SessionRepository methods.
 * Purpose-built — NOT Prisma model types.
 *
 * Refresh token discipline:
 *   - SessionRepository ONLY stores refreshTokenHash
 *   - Raw refresh token is NEVER stored
 *   - Caller (SessionService) hashes before passing to create()
 */

/**
 * CreateSessionInput — data required to create a new session row.
 *
 * refreshTokenHash: caller must hash the raw token before passing here.
 * expiresAt: caller computes from auth config (JWT_REFRESH_EXPIRES_IN).
 */
export interface CreateSessionInput {
  /** Optional: pre-computed session ID. If omitted, DB generates via cuid(). */
  id?: string;
  tenantId: string;
  userId: string;
  /** Argon2id/bcrypt hash of the refresh token. Never the raw token. */
  refreshTokenHash: string;
  expiresAt: Date;
  /** Optional: parsed or raw User-Agent string from request */
  deviceInfo?: string | null;
  /** Optional: client IP address from request */
  ipAddress?: string | null;
  /** Optional: raw User-Agent header value */
  userAgent?: string | null;
}

/**
 * SessionRecord — minimal session shape returned by SessionRepository.
 *
 * revokedAt: null = active session. Non-null = revoked.
 * expiresAt: DB-level expiry. Compared to now() in JwtStrategy.
 *
 * Note: refreshTokenHash is excluded from most returns intentionally.
 * Only findByHash() uses it for lookup — it is not needed in other
 * query results and must not be casually exposed.
 */
export interface SessionRecord {
  id: string;
  tenantId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface SessionWithHash extends SessionRecord {
  refreshTokenHash: string;
}

/**
 * SessionForRevocation — minimal shape needed to confirm revoke operations.
 * Returned by revoke() and revokeAll() to confirm what was affected.
 */
export interface SessionForRevocation {
  id: string;
  revokedAt: Date;
}
