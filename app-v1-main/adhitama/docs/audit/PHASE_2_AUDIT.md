# Phase 2 Audit

## 1. Current State
- Auth module includes login, refresh, logout, logout-all, and me endpoints.
- Core auth infrastructure includes `JwtStrategy`, `JwtAuthGuard`, and `TokenService`.
- Refresh tokens are signed and session rows store hashed `refreshTokenHash`.
- Access tokens are validated via Passport JWT strategy with user and session checks.

## 2. Good Implementation
- JWT payload is minimal and follows blueprint: `sub`, `tenantId`, `sessionId`, `roleId`.
- Refresh tokens are hashed before storage in sessions via `SessionService`.
- Access token validation checks user existence, active status, soft delete, session existence, revoke state, and session expiry.
- Password hashing is centralized through `PasswordService` and comments indicate Argon2 usage.
- `CurrentUser` decorator cleanly exposes authenticated identity without extra service calls.

## 3. Problems Found
- [S1] Refresh token rotation does not validate the raw refresh token against the stored session hash.
- [S1] `refreshTokens()` revokes a session by `sessionId` and `userId` without checking whether the session is active or belongs to the presented token.
- [S2] `SessionRepository.findByHash()` exists but is unused, indicating incomplete refresh-token discipline.
- [S2] `AuthService.login()` does not normalize email before lookup, causing case-sensitive login fragility.
- [S2] `mustChangePassword` is returned in auth responses but not enforced server-side for protected endpoint access.
- [S2] `emailVerifiedAt` is not used for login or sensitive gating despite blueprint guidance.
- [S3] `JwtStrategy` session lookup omits tenant scope in the session query.
- [S3] `AuthController` still accepts `x-tenant-id` header on login for tenant resolution.

## 4. Root Cause Analysis
- The code documents strong refresh-token discipline, but the actual flow stops at signature verification and fails to bind token to session state.
- The service layer is partially implemented with features planned for future phases, creating a security gap today.
- Tenant and verification gating were deferred and not enforced consistently.
- Architecture comments are ahead of implementation, causing mismatch between blueprint intent and runtime behavior.

## 5. Recommended Fix
- Require `refreshTokens()` to verify the provided refresh token matches the stored session hash before issuing a new pair.
- Harden `sessionService.revokeSession()` to require the session to be active and not already revoked before refresh rotation.
- Enforce `mustChangePassword` and email verification gates via service or guard for sensitive resource access.
- Normalize login email before repository lookup to avoid case-sensitive failures.
- Add tenant scope to all session queries and replace header-based tenant extraction with middleware in the next phase.

## 6. Architectural Impact
- Fixing refresh token replay will harden session security without changing the public auth contract.
- Enforcing must-change-password and email verification elevates security and reduces reliance on frontend behavior.
- Improving tenant-scope handling reduces cross-tenant risk in auth flows.
- These changes impact auth orchestration, session lifecycle, and future RBAC enforcement.
