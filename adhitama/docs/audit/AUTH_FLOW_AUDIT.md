# COMPLIANCE STATUS

Overall Status: ⚠ PARTIALLY COMPLIANT

## Rule
Login flow must be stateless for access tokens, session-based for refresh tokens, and enforce user status.

## Current Implementation
Login authenticates with email/NIP, validates password, signs access/refresh tokens, creates session, and updates lastLoginAt. It returns a minimal user DTO.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
N/A for the core login flow. The direct `PrismaService` calls for `lastLoginAt` and name lookup are architectural drift, not auth drift.

## Required Fix
Move the `lastLoginAt` update and display name lookup into repository methods or dedicated service helpers.

---

## Rule
Refresh flow must rotate refresh tokens and validate stored session state.

## Current Implementation
Refresh flow verifies refresh token signature, validates raw token ownership against the stored session hash, then atomically revokes the old session and creates a new one.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S1

## Why This Is Dangerous
N/A after the fix. The refresh flow now rejects stale, revoked, or mismatched refresh tokens and revokes all sessions on replay detection.

## Required Fix
None. Continue monitoring and ensure session revocation remains atomic on rotation.

---

## Rule
Logout must revoke only the current session.

## Current Implementation
`logout()` calls `SessionService.revokeSession()` with `sessionId` and `userId` from `@CurrentUser()`.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
If the session revoke logic does not explicitly verify the session belongs to the user, it could be abused. Current implementation is scoped by userId.

## Required Fix
None immediate, but consider returning session state on revoke failure for diagnostics.

---

## Rule
Logout-all must revoke all sessions for the current user and tenant.

## Current Implementation
`logoutAll()` calls `SessionService.revokeAllSessions(userId, tenantId)`.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
N/A for current behavior. Ensure future session revocation also invalidates active refresh tokens immediately.

## Required Fix
None immediate.

---

## Rule
JwtStrategy must verify user exists, is active, not deleted, and session exists, active, and not expired.

## Current Implementation
JwtStrategy checks user by `id` and `tenantId`; validates `status`, `deletedAt`, and session `revokedAt`/`expiresAt`.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Session query omits tenantId and relies on userId/sessionId uniqueness. Add explicit tenant scoping to harden the validation pipeline.

## Required Fix
Include `tenantId` in the session lookup inside JwtStrategy.

---

## Rule
PermissionGuard should enforce RBAC without duplicating auth logic and without leaking permission structures.

## Current Implementation
PermissionGuard reads route metadata and queries `rolePermission` count for required permissions. It returns 403 on mismatch.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
Stateless permission checks are good; future performance risk exists due to lack of caching.

## Required Fix
Add a Redis-cached permission lookup in future phases.

---

## Rule
CurrentUser decorator must only extract the authenticated user from the request.

## Current Implementation
`@CurrentUser()` returns `request.user` and does not access the database.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S4

## Why This Is Dangerous
N/A

## Required Fix
Maintain this behavior.

---

## Rule
Refresh token hashing must store only a token hash in the DB and never persist raw tokens.

## Current Implementation
`SessionService` hashes raw refresh tokens before calling `SessionRepository.create()`.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S4

## Why This Is Dangerous
N/A

## Required Fix
None.

---

## Rule
Session expiration must be enforced in runtime validation.

## Current Implementation
JwtStrategy checks `expiresAt < new Date()` and rejects expired sessions.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
N/A

## Required Fix
None.
