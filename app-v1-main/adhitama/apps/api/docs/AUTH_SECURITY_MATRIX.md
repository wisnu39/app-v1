# AUTH SECURITY TEST MATRIX

**Project:** Adhitama Enterprise Rental ERP  
**Phase:** S2.2e True Auth E2E Security Validation  
**Date:** 2026-06-05  
**Purpose:** Complete security test coverage matrix

---

## 1. AUTHENTICATION SECURITY

### 1.1 Valid Email Login
| Item | Value |
|------|-------|
| **Scenario** | User logs in with correct email and password in correct tenant |
| **Expected Result** | ✅ 200 OK, token pair, user profile returned |
| **Risk Level** | Critical (happy path) |
| **Existing Test** | `.todo('login success')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.2 Valid NIP Login
| Item | Value |
|------|-------|
| **Scenario** | User logs in with correct NIP and password in correct tenant |
| **Expected Result** | ✅ 200 OK, token pair, user profile returned |
| **Risk Level** | Critical (happy path) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.3 Invalid Email (Unknown User)
| Item | Value |
|------|-------|
| **Scenario** | Login with email that doesn't exist in tenant |
| **Expected Result** | ❌ 401 Unauthorized, generic error message, failure audited |
| **Risk Level** | Critical (user enumeration) |
| **Existing Test** | `.todo('login invalid credentials')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.4 Invalid NIP (Unknown User)
| Item | Value |
|------|-------|
| **Scenario** | Login with NIP that doesn't exist in tenant |
| **Expected Result** | ❌ 401 Unauthorized, generic error message, failure audited |
| **Risk Level** | Critical (user enumeration) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.5 Wrong Password
| Item | Value |
|------|-------|
| **Scenario** | Login with correct email but wrong password |
| **Expected Result** | ❌ 401 Unauthorized, generic error message, failure counted |
| **Risk Level** | Critical (brute force) |
| **Existing Test** | `.todo('login invalid credentials')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.6 Inactive Account
| Item | Value |
|------|-------|
| **Scenario** | Login with correct credentials but `isActive = false` |
| **Expected Result** | ❌ 401 Unauthorized, account inactive error |
| **Risk Level** | High (account suspension bypass) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.7 Deleted Account
| Item | Value |
|------|-------|
| **Scenario** | Login with email of soft-deleted user (`deletedAt IS NOT NULL`) |
| **Expected Result** | ❌ 401 Unauthorized, generic error (user not found) |
| **Risk Level** | High (deleted account reactivation) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.8 Cross-Tenant Login
| Item | Value |
|------|-------|
| **Scenario** | User in Tenant A attempts login in Tenant B |
| **Expected Result** | ❌ 401 Unauthorized, user not found in tenant |
| **Risk Level** | Critical (tenant escape) |
| **Existing Test** | `.todo('cross-tenant rejection')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.9 Throttling: Per-Identifier Lock
| Item | Value |
|------|-------|
| **Scenario** | 5 failed login attempts for same email within 10min |
| **Expected Result** | 6th attempt: ❌ 429 Too Many Requests, locked for 15min |
| **Risk Level** | Critical (brute force) |
| **Existing Test** | `.todo('login brute-force lockout')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.10 Throttling: Per-IP Lock
| Item | Value |
|------|-------|
| **Scenario** | 10 failed login attempts from same IP (different identifiers) within 10min |
| **Expected Result** | 11th attempt: ❌ 429 Too Many Requests, locked for 15min |
| **Risk Level** | Critical (distributed brute force) |
| **Existing Test** | `.todo('login brute-force lockout')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.11 Throttling: Counter Reset on Success
| Item | Value |
|------|-------|
| **Scenario** | 3 failed logins, then successful login for same email |
| **Expected Result** | ✅ Counters cleared, subsequent failed attempts start fresh |
| **Risk Level** | Medium (throttling accuracy) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.12 Throttling: Redis Unavailable
| Item | Value |
|------|-------|
| **Scenario** | Login with Redis connection unavailable |
| **Expected Result** | ✅ Login proceeds without throttling (degraded security) |
| **Risk Level** | Medium (availability) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.13 Audit Logging: Login Success
| Item | Value |
|------|-------|
| **Scenario** | Successful login recorded in audit trail |
| **Expected Result** | ✅ `auth.login.success` event with userId, identifier, IP, timestamp |
| **Risk Level** | Medium (audit) |
| **Existing Test** | `.todo('audit event emission')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 1.14 Audit Logging: Login Failure
| Item | Value |
|------|-------|
| **Scenario** | Failed login recorded in audit trail |
| **Expected Result** | ✅ `auth.login.failure` event with identifier, reason, IP, timestamp |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 2. REFRESH TOKEN ROTATION SECURITY

### 2.1 Valid Refresh
| Item | Value |
|------|-------|
| **Scenario** | After login, call refresh with valid refresh token |
| **Expected Result** | ✅ 200 OK, new access token, new refresh token |
| **Risk Level** | Critical (happy path) |
| **Existing Test** | `.todo('refresh token success')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.2 Expired Access Token Refresh
| Item | Value |
|------|-------|
| **Scenario** | Access token expired (15min), refresh token still valid |
| **Expected Result** | ✅ 200 OK, new access token (refresh token valid) |
| **Risk Level** | Critical (token expiry handling) |
| **Existing Test** | `.todo('refresh token success')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.3 Malformed Refresh Token
| Item | Value |
|------|-------|
| **Scenario** | Refresh endpoint called with invalid JWT structure |
| **Expected Result** | ❌ 401 Unauthorized, JWT malformed error |
| **Risk Level** | Medium (input validation) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.4 Invalid Refresh Signature
| Item | Value |
|------|-------|
| **Scenario** | Refresh token with tampered payload (invalid signature) |
| **Expected Result** | ❌ 401 Unauthorized, JWT signature invalid |
| **Risk Level** | Critical (token forgery) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.5 Expired Refresh Token
| Item | Value |
|------|-------|
| **Scenario** | Refresh token JWT has expired (> 7 days) |
| **Expected Result** | ❌ 401 Unauthorized, token expired |
| **Risk Level** | High (token reuse) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.6 Rotation: Old Token Invalidated
| Item | Value |
|------|-------|
| **Scenario** | After refresh, attempt to use old refresh token again |
| **Expected Result** | ❌ 401 Unauthorized, token already used / session revoked |
| **Risk Level** | Critical (replay protection) |
| **Existing Test** | `.todo('refresh token replay rejection')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.7 Rotation: Atomic Transaction
| Item | Value |
|------|-------|
| **Scenario** | Two concurrent refresh requests with same old token |
| **Expected Result** | ✅ First succeeds, second gets 401 (both not allowed) |
| **Risk Level** | Critical (race condition) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.8 Rotation: Session ID Changes
| Item | Value |
|------|-------|
| **Scenario** | After refresh, new session ID in new refresh token |
| **Expected Result** | ✅ SessionId different from old refresh token |
| **Risk Level** | High (session tracking) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.9 Session Not Found
| Item | Value |
|------|-------|
| **Scenario** | Refresh with sessionId that doesn't exist |
| **Expected Result** | ❌ 401 Unauthorized, all sessions revoked (stale detection) |
| **Risk Level** | Critical (replay detection) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.10 Session Revoked
| Item | Value |
|------|-------|
| **Scenario** | Refresh with sessionId already revoked (old logout session) |
| **Expected Result** | ❌ 401 Unauthorized |
| **Risk Level** | Critical (logout enforcement) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.11 Session Expired
| Item | Value |
|------|-------|
| **Scenario** | Refresh with sessionId where expiresAt < now |
| **Expected Result** | ❌ 401 Unauthorized, session expired |
| **Risk Level** | High (session expiry) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.12 User Deleted Between Login & Refresh
| Item | Value |
|------|-------|
| **Scenario** | User soft-deleted after login, now refresh attempted |
| **Expected Result** | ❌ 401 Unauthorized, user not found |
| **Risk Level** | High (deleted user access) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 2.13 Cross-Tenant Refresh
| Item | Value |
|------|-------|
| **Scenario** | Refresh token from Tenant A used in Tenant B request |
| **Expected Result** | ❌ 401 Unauthorized, tenant mismatch |
| **Risk Level** | Critical (tenant escape) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 3. REPLAY ATTACK DETECTION

### 3.1 Token Reuse Detection
| Item | Value |
|------|-------|
| **Scenario** | Old refresh token reused after new token obtained |
| **Expected Result** | ❌ 401 Unauthorized, all sessions revoked |
| **Risk Level** | Critical (replay) |
| **Existing Test** | `.todo('refresh token replay rejection')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 3.2 Multiple Reuse Attempts
| Item | Value |
|------|-------|
| **Scenario** | Same old token used multiple times concurrently |
| **Expected Result** | ❌ 401 for all attempts, audit events logged |
| **Risk Level** | Critical (replay) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 3.3 Stolen Token Usage
| Item | Value |
|------|-------|
| **Scenario** | Attacker gets old refresh token, tries to use after legitimate refresh |
| **Expected Result** | ❌ 401 Unauthorized (token revoked) |
| **Risk Level** | Critical (compromise) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 3.4 Hash Verification Mandatory
| Item | Value |
|------|-------|
| **Scenario** | Verify raw token is compared against stored hash (not plaintext) |
| **Expected Result** | ✅ SessionService.verifyRefreshTokenOwnership() calls PasswordService.verify() |
| **Risk Level** | Critical (token security) |
| **Existing Test** | None (code review only) |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 3.5 Hash Mismatch Forces Revoke
| Item | Value |
|------|-------|
| **Scenario** | Hash mismatch detected (compromised token) |
| **Expected Result** | ✅ ALL sessions revoked immediately |
| **Risk Level** | Critical (compromise response) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 4. SESSION SECURITY

### 4.1 Single Logout
| Item | Value |
|------|-------|
| **Scenario** | User logs out from Device A (single device) |
| **Expected Result** | ✅ Device A refresh token unusable, Device B still valid |
| **Risk Level** | Critical (multi-device) |
| **Existing Test** | `.todo('logout session revocation')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 4.2 Logout All
| Item | Value |
|------|-------|
| **Scenario** | User calls logout-all |
| **Expected Result** | ✅ ALL device refresh tokens unusable, all sessions revoked |
| **Risk Level** | Critical (logout enforcement) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 4.3 Session Revocation Scoping
| Item | Value |
|------|-------|
| **Scenario** | Logout scoped by userId + tenantId |
| **Expected Result** | ✅ Only user's own sessions revoked (no cross-user impact) |
| **Risk Level** | Critical (session isolation) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 4.4 Session Not Revocable Again
| Item | Value |
|------|-------|
| **Scenario** | Attempt to logout same session twice |
| **Expected Result** | ✅ First succeeds (revoked), second succeeds gracefully (idempotent) |
| **Risk Level** | Low (idempotency) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 4.5 Revoked Session Blocks Refresh
| Item | Value |
|------|-------|
| **Scenario** | After logout, attempt refresh with revoked session token |
| **Expected Result** | ❌ 401 Unauthorized, session already revoked |
| **Risk Level** | Critical (logout enforcement) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 4.6 Session Expiry Blocks Refresh
| Item | Value |
|------|-------|
| **Scenario** | Session expiresAt has passed, refresh attempted |
| **Expected Result** | ❌ 401 Unauthorized, session expired |
| **Risk Level** | High (session lifetime) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 5. MULTI-DEVICE SECURITY

### 5.1 Multi-Device Login
| Item | Value |
|------|-------|
| **Scenario** | User login on Device A, then Device B (same user) |
| **Expected Result** | ✅ Both sessions active, different sessionIds |
| **Risk Level** | High (multi-device) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 5.2 Device A Logout
| Item | Value |
|------|-------|
| **Scenario** | User logout on Device A, Device B still logged in |
| **Expected Result** | ✅ Device A session revoked, Device B refresh still works |
| **Risk Level** | Critical (multi-device) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 5.3 Device B Logout
| Item | Value |
|------|-------|
| **Scenario** | User logout on Device B (after A), Device A not affected |
| **Expected Result** | ✅ Device B session revoked, Device A already revoked |
| **Risk Level** | Critical (multi-device) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 5.4 Device Metadata Stored
| Item | Value |
|------|-------|
| **Scenario** | Login with deviceInfo, userAgent, IP headers |
| **Expected Result** | ✅ All metadata stored in session (for audit/security) |
| **Risk Level** | Low (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 5.5 Logout All Revokes All Devices
| Item | Value |
|------|-------|
| **Scenario** | User calls logout-all from Device A (Device B also active) |
| **Expected Result** | ✅ All sessions revoked, both devices logged out |
| **Risk Level** | Critical (security response) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 6. TENANT ISOLATION

### 6.1 Cross-Tenant Login Rejection
| Item | Value |
|------|-------|
| **Scenario** | User in Tenant A attempts login with Tenant B credentials in Tenant B header |
| **Expected Result** | ❌ 401 Unauthorized, user not in tenant |
| **Risk Level** | Critical (tenant escape) |
| **Existing Test** | `.todo('cross-tenant rejection')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 6.2 Cross-Tenant Refresh Rejection
| Item | Value |
|------|-------|
| **Scenario** | Token from Tenant A used to refresh in Tenant B (header changed) |
| **Expected Result** | ❌ 401 Unauthorized, tenantId mismatch |
| **Risk Level** | Critical (tenant escape) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 6.3 Query-Level Tenant Scoping
| Item | Value |
|------|-------|
| **Scenario** | Verify all user queries include `WHERE { tenantId }` |
| **Expected Result** | ✅ Code review confirms scoping on all lookups |
| **Risk Level** | Critical (data breach) |
| **Existing Test** | None (code review only) |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 6.4 Session Query Isolation
| Item | Value |
|------|-------|
| **Scenario** | Session lookup includes tenantId + userId scoping |
| **Expected Result** | ✅ Cannot access sessions from other tenants |
| **Risk Level** | Critical (data breach) |
| **Existing Test** | None (code review only) |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 6.5 Tenant Isolation: Verification Tokens
| Item | Value |
|------|-------|
| **Scenario** | Email verification token from Tenant A used in Tenant B |
| **Expected Result** | ❌ Token not found (tenant-scoped lookup returns null) |
| **Risk Level** | High (tenant escape) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 6.6 Tenant Isolation: Reset Tokens
| Item | Value |
|------|-------|
| **Scenario** | Password reset token from Tenant A used in Tenant B |
| **Expected Result** | ❌ Token not found (tenant-scoped lookup returns null) |
| **Risk Level** | High (tenant escape) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 7. EMAIL VERIFICATION SECURITY

### 7.1 Valid Token Verification
| Item | Value |
|------|-------|
| **Scenario** | Verify email with valid, unexpired, unused token |
| **Expected Result** | ✅ 200 OK, email marked verified, token marked used |
| **Risk Level** | Critical (email verification) |
| **Existing Test** | `.todo('verify email success')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 7.2 Expired Token Rejection
| Item | Value |
|------|-------|
| **Scenario** | Verify email with token where expiresAt < now (24h+) |
| **Expected Result** | ❌ 400 Bad Request, token expired |
| **Risk Level** | High (token expiry) |
| **Existing Test** | `.todo('expired verification token')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 7.3 Invalid Token
| Item | Value |
|------|-------|
| **Scenario** | Verify email with invalid/tampered token hash |
| **Expected Result** | ❌ 400 Bad Request, token not found |
| **Risk Level** | Medium (input validation) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 7.4 Reused Token Rejection
| Item | Value |
|------|-------|
| **Scenario** | Token already used (usedAt IS NOT NULL), attempt to verify again |
| **Expected Result** | ❌ 400 Bad Request, token already used |
| **Risk Level** | High (token reuse) |
| **Existing Test** | `.todo('reused verification token')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 7.5 Resend Invalidates Previous
| Item | Value |
|------|-------|
| **Scenario** | Resend verification invalidates all previous unused tokens |
| **Expected Result** | ✅ Old tokens cannot verify, new token issued |
| **Risk Level** | High (token reuse) |
| **Existing Test** | `.todo('resend invalidates old token')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 7.6 Token Hashing (Never Stored Raw)
| Item | Value |
|------|-------|
| **Scenario** | Verify token is hashed in database (never stored plaintext) |
| **Expected Result** | ✅ Database inspection confirms hashing |
| **Risk Level** | Critical (token exposure) |
| **Existing Test** | None (code review only) |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 7.7 Cross-Tenant Token Reuse
| Item | Value |
|------|-------|
| **Scenario** | Token from Tenant A user attempted in Tenant B |
| **Expected Result** | ❌ Token not found (tenant mismatch) |
| **Risk Level** | High (tenant escape) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 8. FORGOT PASSWORD SECURITY

### 8.1 Valid Reset
| Item | Value |
|------|-------|
| **Scenario** | Request reset, receive token, reset password with valid token |
| **Expected Result** | ✅ 200 OK, password changed, token marked used, all sessions revoked |
| **Risk Level** | Critical (password reset) |
| **Existing Test** | `.todo('reset success')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.2 Expired Reset Token
| Item | Value |
|------|-------|
| **Scenario** | Reset with token where expiresAt < now (1h+) |
| **Expected Result** | ❌ 400 Bad Request, token expired |
| **Risk Level** | High (token expiry) |
| **Existing Test** | `.todo('expired reset token')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.3 Invalid Reset Token
| Item | Value |
|------|-------|
| **Scenario** | Reset with invalid/tampered token hash |
| **Expected Result** | ❌ 400 Bad Request, token not found |
| **Risk Level** | Medium (input validation) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.4 Reused Reset Token
| Item | Value |
|------|-------|
| **Scenario** | Token already used (usedAt IS NOT NULL), attempt reset again |
| **Expected Result** | ❌ 400 Bad Request, token already used |
| **Risk Level** | High (token reuse) |
| **Existing Test** | `.todo('reused reset token')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.5 Password Reset Invalidates Sessions
| Item | Value |
|------|-------|
| **Scenario** | After password reset, all sessions revoked |
| **Expected Result** | ✅ User must re-login with new password |
| **Risk Level** | Critical (compromise response) |
| **Existing Test** | `.todo('reset invalidates sessions')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.6 Request Reset Success
| Item | Value |
|------|-------|
| **Scenario** | Request reset with valid email |
| **Expected Result** | ✅ 200 OK, reset token sent via email, new token created |
| **Risk Level** | Critical (password reset) |
| **Existing Test** | `.todo('request reset success')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.7 Request Reset with Non-Existent Email
| Item | Value |
|------|-------|
| **Scenario** | Request reset with unknown email |
| **Expected Result** | ✅ 200 OK (no indication of user existence) |
| **Risk Level** | Medium (user enumeration prevention) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.8 Resend Invalidates Previous Reset
| Item | Value |
|------|-------|
| **Scenario** | Request reset, then request reset again before use |
| **Expected Result** | ✅ New token issued, old token invalidated |
| **Risk Level** | High (token reuse) |
| **Existing Test** | `.todo('resend invalidates previous reset token')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.9 Cross-Tenant Token Reuse
| Item | Value |
|------|-------|
| **Scenario** | Reset token from Tenant A user attempted in Tenant B |
| **Expected Result** | ❌ Token not found (tenant mismatch) |
| **Risk Level** | High (tenant escape) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 8.10 Force Password Change
| Item | Value |
|------|-------|
| **Scenario** | User with `mustChangePassword = true` tries to access app |
| **Expected Result** | ❌ Access blocked until password changed |
| **Risk Level** | High (security enforcement) |
| **Existing Test** | `.todo('force password change enforcement')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 9. BRUTE FORCE PROTECTION

### 9.1 Per-Identifier Threshold
| Item | Value |
|------|-------|
| **Scenario** | 5 failed login attempts for same identifier in 10min |
| **Expected Result** | 6th attempt blocked with 429, lock for 15min |
| **Risk Level** | Critical (brute force) |
| **Existing Test** | `.todo('login brute-force lockout')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 9.2 Per-IP Threshold
| Item | Value |
|------|-------|
| **Scenario** | 10 failed login attempts from same IP in 10min |
| **Expected Result** | 11th attempt blocked with 429, lock for 15min |
| **Risk Level** | Critical (distributed brute force) |
| **Existing Test** | `.todo('login brute-force lockout')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 9.3 Lock Expiry
| Item | Value |
|------|-------|
| **Scenario** | After 15min lockout expires, login re-attempted |
| **Expected Result** | ✅ Login allowed (lock has expired) |
| **Risk Level** | High (lockout duration) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 9.4 Success Clears Counter
| Item | Value |
|------|-------|
| **Scenario** | 3 failed, then 1 successful login |
| **Expected Result** | ✅ Counters cleared, next failures start fresh |
| **Risk Level** | Medium (counter accuracy) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 9.5 Refresh Throttling
| Item | Value |
|------|-------|
| **Scenario** | 10 failed refresh attempts for same session in 10min |
| **Expected Result** | 11th attempt blocked with 429, lock for 15min |
| **Risk Level** | High (token attack) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 9.6 Separate Thresholds
| Item | Value |
|------|-------|
| **Scenario** | Login throttle doesn't affect refresh throttle |
| **Expected Result** | ✅ Independent counters and locks |
| **Risk Level** | Medium (throttling isolation) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 10. REDIS FAILURE HANDLING

### 10.1 Login Without Redis
| Item | Value |
|------|-------|
| **Scenario** | Redis unavailable, login attempted |
| **Expected Result** | ✅ Login succeeds (no throttling applied, degraded mode) |
| **Risk Level** | Medium (availability) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 10.2 Refresh Without Redis
| Item | Value |
|------|-------|
| **Scenario** | Redis unavailable, refresh attempted |
| **Expected Result** | ✅ Refresh succeeds (no throttling, degraded mode) |
| **Risk Level** | Medium (availability) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 10.3 No Application Crash
| Item | Value |
|------|-------|
| **Scenario** | Redis connection fails, security service catches exception |
| **Expected Result** | ✅ Application continues, logs debug message |
| **Risk Level** | High (availability) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 10.4 Debug Logging
| Item | Value |
|------|-------|
| **Scenario** | AuthSecurityService logs when Redis unavailable |
| **Expected Result** | ✅ Debug logs indicate Redis not ready |
| **Risk Level** | Low (observability) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 11. AUDIT LOGGING

### 11.1 Login Success Event
| Item | Value |
|------|-------|
| **Scenario** | Login success recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.login.success`, fields: userId, identifier, IP, tenantId |
| **Risk Level** | Medium (audit) |
| **Existing Test** | `.todo('audit event emission')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.2 Login Failure Event
| Item | Value |
|------|-------|
| **Scenario** | Login failure recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.login.failure`, fields: identifier, reason, IP, tenantId |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.3 Refresh Success Event
| Item | Value |
|------|-------|
| **Scenario** | Refresh success recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.refresh.success`, fields: userId, sessionId, IP, tenantId |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.4 Refresh Failure Event
| Item | Value |
|------|-------|
| **Scenario** | Refresh failure recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.refresh.failure`, fields: sessionId, reason, IP, tenantId |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.5 Logout Event
| Item | Value |
|------|-------|
| **Scenario** | Logout recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.logout.success`, fields: userId, sessionId, IP, tenantId |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.6 Logout All Event
| Item | Value |
|------|-------|
| **Scenario** | Logout-all recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.logout.all`, fields: userId, sessionCount, IP, tenantId |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.7 Email Verification Event
| Item | Value |
|------|-------|
| **Scenario** | Email verification recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.email.verification.success`, fields: userId, email, tenantId |
| **Risk Level** | Low (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.8 Password Reset Event
| Item | Value |
|------|-------|
| **Scenario** | Password reset recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.password.reset.success`, fields: userId, IP, tenantId |
| **Risk Level** | Low (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 11.9 Security Violation Event
| Item | Value |
|------|-------|
| **Scenario** | Replay/suspicious activity recorded to audit trail |
| **Expected Result** | ✅ Event: `auth.security.suspicious`, fields: reason, IP, identifier |
| **Risk Level** | Medium (audit) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## 12. SESSION REVOCATION

### 12.1 Logout Revokes Current Session
| Item | Value |
|------|-------|
| **Scenario** | Single logout revokes one sessionId |
| **Expected Result** | ✅ Session.revokedAt set, refresh fails after logout |
| **Risk Level** | Critical (logout enforcement) |
| **Existing Test** | `.todo('logout session revocation')` |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 12.2 Logout All Revokes All Sessions
| Item | Value |
|------|-------|
| **Scenario** | Logout-all revokes all sessions for user in tenant |
| **Expected Result** | ✅ All sessions revoked, all refreshes fail |
| **Risk Level** | Critical (logout enforcement) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 12.3 Password Change Revokes Sessions
| Item | Value |
|------|-------|
| **Scenario** | After password change, all sessions revoked |
| **Expected Result** | ✅ User must re-login with new password |
| **Risk Level** | Critical (compromise response) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

### 12.4 Revocation Idempotent
| Item | Value |
|------|-------|
| **Scenario** | Revoking already-revoked session doesn't error |
| **Expected Result** | ✅ Idempotent operation (no error) |
| **Risk Level** | Low (idempotency) |
| **Existing Test** | None |
| **Test Status** | ❌ NOT IMPLEMENTED |

---

## TEST IMPLEMENTATION SUMMARY

| Category | Total Tests | Implemented | Missing |
|----------|-------------|-------------|---------|
| Authentication | 14 | 0 | 14 |
| Refresh Token Rotation | 13 | 0 | 13 |
| Replay Attack Detection | 5 | 0 | 5 |
| Session Security | 6 | 0 | 6 |
| Multi-Device | 5 | 0 | 5 |
| Tenant Isolation | 6 | 0 | 6 |
| Email Verification | 7 | 0 | 7 |
| Forgot Password | 10 | 0 | 10 |
| Brute Force Protection | 6 | 0 | 6 |
| Redis Failure Handling | 4 | 0 | 4 |
| Audit Logging | 9 | 0 | 9 |
| Session Revocation | 4 | 0 | 4 |
| **TOTAL** | **93** | **0** | **93** |

---

## CRITICAL TESTS (MUST IMPLEMENT)

### Critical Tier 1 (Security Boundary)
- Authentication: valid login, invalid login, cross-tenant rejection
- Refresh: valid refresh, expired token, cross-tenant refresh
- Replay: token reuse detection, hash verification, revoke on mismatch
- Session: single logout, logout all, revoke enforcement
- Multi-Device: device A logout, device B still valid, logout all revokes all
- Tenant: query scoping, token boundary, cross-tenant escape attempt
- Brute Force: per-identifier lock, per-IP lock, counter reset
- Audit: all events logged with correct fields

### Critical Tier 2 (Data Integrity)
- Email Verification: token expiry, token reuse, resend invalidates
- Password Reset: token expiry, token reuse, sessions revoked after reset
- Rotation: atomicity, concurrent refresh handling
- Session Expiry: expired session blocks refresh

### Critical Tier 3 (Availability)
- Redis Failure: login works, refresh works, no crash
- Throttling Expiry: locks expire after 15min
- Idempotency: logout twice doesn't error

---

## NEXT STEPS

1. ✅ **Phase 1 Complete:** Security Surface Inventory created
2. ✅ **Phase 2 Complete:** Security Test Matrix created (93 tests identified)
3. **Phase 3:** Implement all 93 security tests in E2E suite
4. **Phase 4:** Perform adversarial testing (race conditions, token forgery, etc.)
5. **Phase 5:** Final validation (type-check, all tests pass)
6. **Phase 6:** Generate Security Validation Report

---

**Document Status:** Completed 2026-06-05  
**Total Test Cases Identified:** 93  
**Coverage Target:** 100% (all tests implemented and passing)
