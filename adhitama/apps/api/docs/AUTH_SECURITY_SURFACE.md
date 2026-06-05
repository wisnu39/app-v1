# AUTH SECURITY SURFACE INVENTORY

**Project:** Adhitama Enterprise Rental ERP  
**Phase:** S2.2e True Auth E2E Security Validation  
**Date:** 2026-06-05  
**Status:** Discovery Phase Complete

---

## 1. AUTHENTICATION FLOWS

### 1.1 Login Flow (Email)
- **Entry Point:** `POST /auth/login`
- **Input:** `{ identifier (email), password, tenantId }`
- **Controls:**
  - Pre-flight check: IP throttling via Redis (10 failures per 10min = lockout 15min)
  - Pre-flight check: identifier throttling (5 failures per 10min = lockout 15min)
  - Password validation: Argon2id comparison
  - User existence: soft-delete aware (deletedAt = null)
  - Account active check: `isActive = true`
  - Tenant scoping: must match tenantId from header
  - Session creation: refresh token hashed (Argon2id)
  - Post-login: success metrics logged, counters cleared
- **Output:** `{ accessToken (JWT, 15min), refreshToken (signed), user }`
- **Error Cases:**
  - Unknown email → throttle, audit, 401
  - Wrong password → throttle, audit, 401
  - Account inactive → no throttle, 401
  - Account deleted → no result (soft-delete), 401
  - Wrong tenant → 401
  - Throttled → 429 HTTP exception

### 1.2 Login Flow (NIP)
- **Entry Point:** `POST /auth/login` (NIP variant)
- **Input:** `{ identifier (NIP), password, tenantId }`
- **Controls:**
  - Same pre-flight throttling as email
  - NIP-based user lookup
  - Tenant-scoped query
- **Output:** Same as email login
- **Error Cases:** Same as email login

### 1.3 Login with Device Info
- **Metadata Captured:**
  - `x-device-info` header (optional, stored in session)
  - `User-Agent` header (stored in session)
  - IP Address (extracted, stored in session)
- **Purpose:** Multi-device session tracking
- **Security:** Info is for audit only, not used in validation

---

## 2. REFRESH TOKEN ROTATION FLOW

### 2.1 Refresh Token Endpoint
- **Entry Point:** `POST /auth/refresh`
- **Input:** `{ refreshToken (signed JWT) }`
- **JWT Payload:** `{ sessionId, userId, tenantId, iat, exp }`
- **Controls:**
  - JWT signature verification (RS256, separate secret)
  - JWT expiry check
  - Session existence check (sessionId)
  - Session active check (NOT revoked)
  - Session not expired (expiresAt > now)
  - User exists and active
  - Tenant scoping
  - **Replay Detection:** raw token vs stored hash
    - Active session lookup
    - Hash comparison via PasswordService.verify()
    - On hash mismatch → revoke ALL sessions, audit
  - Token rotation:
    - Old session revoked
    - New session created
    - Atomic via `$transaction`
- **Output:** `{ accessToken (new), refreshToken (new) }`
- **Error Cases:**
  - Invalid JWT signature → 401
  - Expired JWT → 401
  - Session not found → stale detection, revoke all, 401
  - Session already revoked → 401
  - User deleted → 401
  - Token replay (hash mismatch) → revoke all, 401
  - Concurrent refresh (race condition) → revoke all, 401

### 2.2 Session Rotation Atomicity
- **Transaction Scope:**
  - Old session marked revoked
  - New session created
  - Both in single DB transaction
- **Purpose:** Prevent concurrent refresh from both succeeding
- **Guard:** Only first refresh wins, second gets "already used" error

---

## 3. LOGOUT FLOWS

### 3.1 Single Logout (Single Device)
- **Entry Point:** `POST /auth/logout`
- **Guards:** JwtAuthGuard (access token required)
- **Input:** Current session context (from JWT)
- **Controls:**
  - JwtAuthGuard validates access token
  - JwtAuthGuard validates session active
  - SessionService.revokeSession(sessionId, userId, tenantId)
  - Audit event: auth.logout.success
- **Output:** `{ message: "Logged out successfully" }`
- **Effect:** Current refresh token becomes unusable
- **Multi-device Effect:** Other sessions unaffected

### 3.2 Logout All (All Devices)
- **Entry Point:** `POST /auth/logout-all`
- **Guards:** JwtAuthGuard (access token required)
- **Input:** Current session context (from JWT)
- **Controls:**
  - JwtAuthGuard validates access token
  - SessionService.revokeAllSessions(userId, tenantId)
  - Audit event: auth.logout.all
- **Output:** `{ message: "...", sessionsRevoked: N }`
- **Effect:** ALL refresh tokens for user unusable
- **Multi-device Effect:** All sessions revoked
- **Triggers:** User logout-all, password change, admin suspension

---

## 4. SESSION MANAGEMENT

### 4.1 Session Model
```
sessions
  id: UUID
  userId: UUID (fk users)
  tenantId: UUID (fk tenants)
  refreshTokenHash: string (Argon2id)
  expiresAt: datetime
  revokedAt: datetime (nullable)
  deviceInfo: string (nullable)
  ipAddress: string (nullable)
  userAgent: string (nullable)
  createdAt: datetime
  updatedAt: datetime
```

### 4.2 Session Validation
- **On Every Refresh:**
  - Find by sessionId + userId + tenantId
  - Check NOT revoked (revokedAt = null)
  - Check NOT expired (expiresAt > now)
  - Check hash matches raw token
- **Query Isolation:**
  - Must include tenantId clause
  - Must include userId clause
  - Must include revoked filter

### 4.3 Multi-Device Support
- **Multiple Sessions Per User:** Allowed
- **Session Isolation:** By sessionId + userId
- **Device Tracking:** Via deviceInfo + userAgent
- **Single-Device Logout:** Revoke single sessionId
- **All-Device Logout:** Revoke all sessions by userId + tenantId

---

## 5. EMAIL VERIFICATION FLOW

### 5.1 Token Model
```
emailVerificationTokens
  id: UUID
  userId: UUID (fk users)
  tenantId: UUID (fk tenants)
  tokenHash: string (Argon2id)
  expiresAt: datetime
  usedAt: datetime (nullable)
  createdAt: datetime
```

### 5.2 Create Token (on signup)
- **Trigger:** User registration
- **Controls:**
  - Generate random token
  - Hash token (Argon2id)
  - Set expiresAt = now + 24h
  - Store hash (never raw)
  - Invalidate previous unused tokens for user
- **Output:** Raw token only sent via email (never stored)

### 5.3 Verify Email Endpoint
- **Entry Point:** `POST /auth/verify-email`
- **Input:** `{ token }`
- **Controls:**
  - Lookup by hash
  - Check NOT used (usedAt = null)
  - Check NOT expired (expiresAt > now)
  - Mark token as used (usedAt = now)
  - Mark user as verified (emailVerifiedAt = now)
  - Both in single transaction
- **Output:** `{ message: "Email verified successfully" }`
- **Error Cases:**
  - Invalid token → 400
  - Expired token → 400
  - Token already used → 400
  - Cross-user reuse attempt → 400

### 5.4 Resend Verification
- **Entry Point:** `POST /auth/resend-verification`
- **Input:** `{ email, tenantId }`
- **Controls:**
  - Lookup user by email + tenantId
  - Invalidate all previous unused tokens
  - Create new verification token
  - Send new email with token
- **Effect:** Previous tokens invalidated, cannot verify with old tokens

---

## 6. FORGOT PASSWORD FLOW

### 6.1 Token Model
```
passwordResetTokens
  id: UUID
  userId: UUID (fk users)
  tenantId: UUID (fk tenants)
  tokenHash: string (Argon2id)
  expiresAt: datetime
  usedAt: datetime (nullable)
  createdAt: datetime
```

### 6.2 Request Reset Endpoint
- **Entry Point:** `POST /auth/request-password-reset`
- **Input:** `{ email, tenantId }`
- **Controls:**
  - Lookup user by email + tenantId
  - Invalidate all previous unused reset tokens
  - Create new reset token
  - Set expiresAt = now + 1h
  - Send token via email (never stored raw)
- **Output:** `{ message: "Reset email sent" }`
- **Effect:** Previous reset tokens invalidated

### 6.3 Reset Password Endpoint
- **Entry Point:** `POST /auth/reset-password`
- **Input:** `{ token, newPassword }`
- **Controls:**
  - Lookup by hash
  - Check NOT used (usedAt = null)
  - Check NOT expired (expiresAt > now)
  - Hash new password (Argon2id)
  - Update user passwordHash
  - Mark token as used
  - Revoke ALL user sessions (force re-login)
  - All in single transaction
- **Output:** `{ message: "Password reset successfully" }`
- **Error Cases:**
  - Invalid token → 400
  - Expired token → 400
  - Token already used → 400
  - Cross-user reuse attempt → 400

### 6.4 Invalidation on Resend
- **Trigger:** User requests new reset email
- **Effect:**
  - All previous unused reset tokens marked invalid
  - New reset token created

---

## 7. BRUTE FORCE PROTECTION (AuthSecurityService)

### 7.1 Login Throttling
- **Thresholds:**
  - Per-identifier: 5 failures in 10min → 15min lockout
  - Per-IP: 10 failures in 10min → 15min lockout
- **Redis Keys:**
  - `auth:login:failures:identifier:{identifier}` (counter)
  - `auth:login:failures:ip:{ip}` (counter)
  - `auth:login:lock:identifier:{identifier}` (flag)
  - `auth:login:lock:ip:{ip}` (flag)
- **Check Points:**
  - Pre-flight: `preflightLogin()` checks locks
  - Failure: `recordLoginFailure()` increments counters, sets locks
  - Success: `recordLoginSuccess()` clears counters and locks
- **Degradation:** If Redis unavailable, security service returns (no throttling)

### 7.2 Refresh Throttling
- **Thresholds:**
  - Per-session: 10 failures in 10min → 15min lockout
- **Redis Keys:**
  - `auth:refresh:failures:{sessionId}` (counter)
  - `auth:refresh:lock:{sessionId}` (flag)
- **Check Points:**
  - Pre-flight: `preflightRefresh()` checks lock
  - Failure: `recordRefreshFailure()` increments counter, sets lock
  - Success: `recordRefreshSuccess()` clears counter and lock

### 7.3 Security Events
- **Logged Events:**
  - `auth.login.suspicious` (multiple failures)
  - `auth.login.success` (successful login)
  - `auth.refresh.suspicious` (multiple refresh failures)

### 7.4 Redis Failure Handling
- **Behavior:** If Redis unavailable
  - AuthSecurityService.isReady() returns false
  - All throttling checks return (no-op)
  - Login/refresh still proceed normally
  - No throttling applied (security degraded)
  - Application continues functioning
- **Logging:** Debug logs indicate Redis unavailable

---

## 8. AUDIT LOGGING (AuditService Integration)

### 8.1 Login Events
- **Event Type:** `auth.login.success`
- **Fields:** tenantId, userId, identifier, ipAddress
- **Event Type:** `auth.login.failure`
- **Fields:** tenantId, identifier, reason, ipAddress

### 8.2 Token Events
- **Event Type:** `auth.refresh.success`
- **Fields:** tenantId, userId, sessionId, ipAddress
- **Event Type:** `auth.refresh.failure`
- **Fields:** tenantId, sessionId, reason, ipAddress

### 8.3 Logout Events
- **Event Type:** `auth.logout.success`
- **Fields:** tenantId, userId, sessionId, ipAddress
- **Event Type:** `auth.logout.all`
- **Fields:** tenantId, userId, sessionCount, ipAddress

### 8.4 Email Events
- **Event Type:** `auth.email.verification.success`
- **Fields:** tenantId, userId, email
- **Event Type:** `auth.email.verification.resent`
- **Fields:** tenantId, userId, email

### 8.5 Password Events
- **Event Type:** `auth.password.reset.requested`
- **Fields:** tenantId, email (user not verified yet)
- **Event Type:** `auth.password.reset.success`
- **Fields:** tenantId, userId, ipAddress

### 8.6 Security Events
- **Event Type:** `auth.security.suspicious`
- **Fields:** tenantId, reason, ipAddress, identifier

---

## 9. MULTI-TENANT ISOLATION

### 9.1 Tenant Scoping
- **Login:** tenantId from request header (validated by middleware)
- **User Lookup:** WHERE { email, tenantId, deletedAt = null }
- **Session Creation:** Include tenantId
- **Session Lookup:** WHERE { sessionId, userId, tenantId }
- **Refresh:** Verify JWT tenantId matches user's tenantId

### 9.2 Refresh Token Boundary
- **JWT Payload:** Includes tenantId
- **Verification:** JWT tenantId must match decoded user's tenantId
- **Cross-Tenant Attempt:** Rejected at JWT validation layer

### 9.3 Session Isolation
- **Query Scoping:** All session queries include tenantId
- **Revocation Scope:** revokeAllSessions(userId, tenantId)
- **Prevention:** User cannot revoke sessions in other tenants

### 9.4 Email/Password Token Isolation
- **Storage:** tenantId stored with token
- **Lookup:** WHERE { hash, tenantId }
- **Cross-Tenant Attempt:** Token not found for other tenant

---

## 10. SECURITY CONTROLS SUMMARY

| Control | Location | Status |
|---------|----------|--------|
| **Authentication** | | |
| Password Hashing (Argon2id) | PasswordService | ✅ |
| Login Throttling | AuthSecurityService | ✅ |
| Multi-identifier Support (email/NIP) | AuthRepository | ✅ |
| Soft-Delete Awareness | AuthRepository | ✅ |
| Tenant Scoping | All repositories | ✅ |
| **Token Security** | | |
| JWT Signature Verification | TokenService/JwtStrategy | ✅ |
| Access Token Short-lived | TokenService | ✅ |
| Refresh Token Hashing | SessionService | ✅ |
| Refresh Token Rotation | SessionService.rotateSession() | ✅ |
| Replay Attack Protection | SessionService.verifyRefreshTokenOwnership() | ✅ |
| **Session Management** | | |
| Single-Device Logout | SessionService.revokeSession() | ✅ |
| All-Device Logout | SessionService.revokeAllSessions() | ✅ |
| Multi-Device Support | Session model + sessionId | ✅ |
| Session Expiry | JWT exp + session expiresAt | ✅ |
| **Email Verification** | | |
| Token Creation & Hashing | EmailVerificationService | ✅ |
| Token Expiry (24h) | EmailVerificationService | ✅ |
| Token Reuse Prevention | emailVerificationTokens.usedAt | ✅ |
| Token Invalidation on Resend | EmailVerificationService | ✅ |
| **Password Recovery** | | |
| Token Creation & Hashing | ForgotPasswordService | ✅ |
| Token Expiry (1h) | ForgotPasswordService | ✅ |
| Token Reuse Prevention | passwordResetTokens.usedAt | ✅ |
| Sessions Revoked After Reset | ForgotPasswordService | ✅ |
| **Brute Force** | | |
| Per-Identifier Throttling | AuthSecurityService | ✅ |
| Per-IP Throttling | AuthSecurityService | ✅ |
| Per-Session Refresh Throttling | AuthSecurityService | ✅ |
| Redis Fallback | AuthSecurityService | ✅ |
| **Audit Logging** | | |
| Login Events | AuditService | ✅ |
| Token Events | AuditService | ✅ |
| Logout Events | AuditService | ✅ |
| Email Events | AuditService | ✅ |
| Password Events | AuditService | ✅ |
| Security Events | AuditService | ✅ |
| **Tenant Isolation** | | |
| User Query Scoping | AuthRepository | ✅ |
| Session Query Scoping | SessionRepository | ✅ |
| Token Query Scoping | All token repositories | ✅ |
| JWT Tenant Validation | AuthService | ✅ |

---

## 11. CRITICAL SECURITY PATHS

### 11.1 Replay Attack Prevention Chain
1. Client presents refresh token
2. TokenService verifies JWT signature + expiry
3. SessionService.verifyRefreshTokenOwnership():
   - Find active session
   - Verify raw token vs stored hash
   - On mismatch: revoke ALL sessions
4. SessionService.rotateSession():
   - Atomically revoke old, create new
   - Concurrent refresh fails on second attempt

### 11.2 Multi-Device Isolation Chain
1. Login creates session with deviceInfo
2. Each session has unique sessionId
3. Refresh binds to sessionId
4. Single logout revokes one sessionId
5. All-logout revokes all sessionIds

### 11.3 Tenant Escape Prevention Chain
1. TenantMiddleware extracts tenantId from header
2. RequestWithTenant context includes tenantId
3. AuthService verifies JWT tenantId == request tenantId
4. All repository queries include tenantId WHERE clause
5. Cross-tenant token lookup returns null (not found)

### 11.4 Redis Failure Degradation Chain
1. AuthSecurityService.isReady() checks Redis connection
2. If unavailable: all throttling methods return (no-op)
3. Login/refresh continue without throttling
4. Debug logs indicate degraded state
5. Application stays online

---

## 12. SECURITY BOUNDARY VALIDATION

### 12.1 Authentication Boundary
- ✅ Unknown users rejected
- ✅ Wrong password rejected
- ✅ Deleted accounts rejected
- ✅ Inactive accounts rejected
- ✅ Throttling enforced
- ⚠️ **TODO:** Force `emailVerifiedAt` check before app access

### 12.2 Token Boundary
- ✅ JWT signature enforced
- ✅ JWT expiry enforced
- ✅ Refresh token hashed (never exposed)
- ✅ Rotation atomic
- ✅ Replay detection active
- ⚠️ **TODO:** Concurrent refresh race condition test

### 12.3 Session Boundary
- ✅ sessionId + userId + tenantId isolation
- ✅ Revocation prevents reuse
- ✅ Expiry enforced
- ⚠️ **TODO:** Session activity tracking (lastUsedAt)

### 12.4 Tenant Boundary
- ✅ Query-level scoping (WHERE tenantId)
- ✅ JWT payload includes tenantId
- ✅ Cross-tenant token lookup fails
- ⚠️ **TODO:** Header-based tenant resolution (vulnerable to header injection)

### 12.5 Email Boundary
- ✅ Token hashed, never exposed
- ✅ Token expiry enforced
- ✅ Token reuse blocked
- ✅ Resend invalidates previous
- ⚠️ **TODO:** Email already-verified check on login

### 12.6 Password Recovery Boundary
- ✅ Token hashed, never exposed
- ✅ Token expiry enforced (1h)
- ✅ Token reuse blocked
- ✅ Sessions revoked after reset
- ⚠️ **TODO:** Old password usage prevention

---

## 13. KNOWN GAPS & FUTURE WORK

### 13.1 High Priority
1. **Server-side `mustChangePassword` enforcement** — Blueprint requires redirect before app access
2. **Server-side `emailVerifiedAt` gating** — Email verification should gate protected endpoints
3. **Concurrent refresh race condition** — May allow multiple valid tokens from single old token

### 13.2 Medium Priority
1. **Session activity tracking** — lastUsedAt timestamp for anomaly detection
2. **Device fingerprinting** — Enhanced deviceInfo validation
3. **Trusted device flow** — Remember-me support (future auth flow)
4. **Login anomaly detection** — Geo-velocity checks, device history

### 13.3 Low Priority
1. **Refresh token blacklist** — Alternative to session-based (currently session-based)
2. **Token versioning** — Handle key rotation scenarios
3. **CSRF tokens** — For form-based submission endpoints (SPA uses Bearer token)

---

## 14. VALIDATION CHECKLIST

- [ ] All 12 flows end-to-end tested
- [ ] All error cases verified
- [ ] Replay attack prevention validated
- [ ] Multi-device isolation verified
- [ ] Tenant isolation validated
- [ ] Brute force lockout enforced
- [ ] Email token reuse blocked
- [ ] Password token reuse blocked
- [ ] Refresh rotation atomicity verified
- [ ] Redis failure degradation tested
- [ ] Audit events logged correctly
- [ ] All guards in place
- [ ] No production code changes (unless defect proven)

---

## 15. DOCUMENT STATUS

**Created:** 2026-06-05  
**Phase:** 1 - Discovery / Security Surface Analysis  
**Next:** Phase 2 - Security Test Matrix  
**Prepared By:** Senior Security Engineer (S2.2e)
