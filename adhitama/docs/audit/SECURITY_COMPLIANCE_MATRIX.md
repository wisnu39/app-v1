# COMPLIANCE STATUS

Overall Status: ⚠ PARTIALLY COMPLIANT

## JWT payload minimalism
**Current Implementation:** Access token payload contains only `sub`, `tenantId`, `sessionId`, `roleId`.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S4
**Why This Is Dangerous:** N/A
**Required Fix:** None.

---

## Refresh token rotation
**Current Implementation:** Refresh flow rotates sessions by validating refresh token ownership, revoking the old session, and issuing a new signed token pair atomically.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S1
**Why This Is Dangerous:** N/A after fix. The refresh flow now verifies the raw refresh token against the stored session hash and binds rotation to an active session.
**Required Fix:** None. Maintain refresh token ownership checks and transactional session rotation.

---

## Session revocation
**Current Implementation:** `logout()` and `logoutAll()` revoke sessions via `SessionService` and `SessionRepository`.
**Compliance Status:** ⚠ PARTIALLY COMPLIANT
**Risk Level:** S2
**Why This Is Dangerous:** `revokeSession()` is idempotent but does not verify the refresh token hash or session active state before reuse. Token replay remains possible.
**Required Fix:** Add explicit session state check and tie revocation to refresh token hash validation.

---

## Refresh replay protection
**Current Implementation:** Refresh token verification now checks JWT signature/expiry and verifies the raw refresh token against the stored session hash. Old sessions are revoked atomically during rotation.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S1
**Why This Is Dangerous:** N/A after fix. Stolen or replayed refresh tokens are rejected, and detected replay attempts revoke all user sessions.
**Required Fix:** None. Monitor replay logs and preserve no-raw-token storage discipline.

---

## Argon2id usage
**Current Implementation:** `PasswordService` is used for password hashing and refresh token hashing; docs refer to Argon2id.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S4
**Why This Is Dangerous:** N/A
**Required Fix:** None.

---

## Sensitive logging
**Current Implementation:** Logs contain userId, sessionId, roleId, tenantId; raw tokens/passwords are not logged.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S4
**Why This Is Dangerous:** N/A
**Required Fix:** Continue auditing logs for accidental token/password output.

---

## DTO whitelist
**Current Implementation:** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` enabled.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S4
**Why This Is Dangerous:** N/A
**Required Fix:** None.

---

## ValidationPipe safety
**Current Implementation:** Global pipe is registered in `main.ts` with transform enabled and strict whitelist.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S4
**Why This Is Dangerous:** N/A
**Required Fix:** None.

---

## Tenant isolation
**Current Implementation:** Most repositories filter by `tenantId`; login still reads `x-tenant-id` header and some services validate tenant explicitly.
**Compliance Status:** ⚠ PARTIALLY COMPLIANT
**Risk Level:** S1
**Why This Is Dangerous:** Header-based tenant selection can be spoofed and does not enforce tenant resolution consistently.
**Required Fix:** Centralize tenant resolution in middleware or `CurrentUser` context and remove header-based tenant lookup.

---

## RBAC isolation
**Current Implementation:** PermissionGuard uses `roleId` and checks required permissions via DB count.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S3
**Why This Is Dangerous:** It relies on roleId tenant binding rather than explicit tenant check, creating a secondary dependency on token integrity.
**Required Fix:** Consider explicit tenant-scoped role validation inside the guard to harden isolation.

---

## System role protection
**Current Implementation:** `RbacService` asserts system roles cannot be modified or deleted.
**Compliance Status:** ⚠ PARTIALLY COMPLIANT
**Risk Level:** S2
**Why This Is Dangerous:** Service-level protections are good, but repository or DB-level safeguards are not present.
**Required Fix:** Add repository-level validation or stronger system-role invariants if possible.

---

## Profile completion enforcement
**Current Implementation:** `getMe()` returns `profileCompleted` but there is no middleware to enforce completion.
**Compliance Status:** ❌ NON-COMPLIANT
**Risk Level:** S2
**Why This Is Dangerous:** Users can access protected resources without completing onboarding.
**Required Fix:** Implement middleware or guard that blocks access when `profileCompleted` is false.

---

## mustChangePassword enforcement
**Current Implementation:** Flag is returned in auth response but not enforced by any guard.
**Compliance Status:** ❌ NON-COMPLIANT
**Risk Level:** S1
**Why This Is Dangerous:** Users may bypass the required password reset path.
**Required Fix:** Add a guard that blocks normal app access until password change is completed.

---

## Email verification enforcement
**Current Implementation:** Email verified status is tracked but not used to block protected flows.
**Compliance Status:** ❌ NON-COMPLIANT
**Risk Level:** S1
**Why This Is Dangerous:** Unverified or spoofed emails can access the app.
**Required Fix:** Enforce email verification in auth or permission guards for sensitive operations.

---

## Cross-tenant query protection
**Current Implementation:** Repositories enforce tenant filters, but direct Prisma usage and token header extraction introduce risk.
**Compliance Status:** ⚠ PARTIALLY COMPLIANT
**Risk Level:** S2
**Why This Is Dangerous:** Direct DB queries without tenant context can leak data across tenants.
**Required Fix:** Remove direct Prisma usage from services and add tenant scoping to all DB queries in guards and helpers.

---

## Soft delete consistency
**Current Implementation:** Repositories generally filter `deletedAt: null`; some direct service lookups bypass tenant/delete filters.
**Compliance Status:** ⚠ PARTIALLY COMPLIANT
**Risk Level:** S2
**Why This Is Dangerous:** Soft-deleted users may become visible to some flows or be incorrectly updated.
**Required Fix:** Ensure all user/entity reads use repository methods or explicit `deletedAt: null` filters.

---

## Audit logging foundation
**Current Implementation:** `AuditModule`, `AuditService`, `AuditRepository`, metadata sanitization, and feature-level audit hooks are implemented for auth, user, and RBAC flows.
**Compliance Status:** ✅ FULLY COMPLIANT
**Risk Level:** S3
**Why This Is Dangerous:** Audit records are best-effort; if the audit write fails the primary flow continues, so operational monitoring must treat audit failures as a support signal.
**Required Fix:** Continue monitoring audit write failures and expand coverage for future modules.
