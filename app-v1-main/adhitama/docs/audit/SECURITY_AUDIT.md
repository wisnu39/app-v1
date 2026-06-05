# Security Audit

## 1. Current State
- JWT-based auth is implemented with separate access and refresh secrets.
- Refresh tokens are signed and session rows store hashed refresh token values.
- `JwtStrategy` validates access tokens and checks user/session state.
- Role-based permissions are enforced by `PermissionGuard` on guarded routes.
- Environment validation enforces minimum secret lengths.

## 2. Good Implementation
- Access token payload is minimal and avoids sensitive fields.
- Access and refresh token secrets are distinct and validated for length.
- Session revocation is supported via logout and logout-all flows.
- `JwtStrategy` enforces user active status and session expiration.
- `CurrentUser` decorator separates auth identity from business logic.

## 3. Problems Found
- [S1] Refresh token replay vulnerability: fixed by refresh token ownership verification and atomic session rotation.
- [S1] Session reuse risk: `SessionService.revokeSession()` can revoke already-revoked sessions without requiring active session state.
- [S1] Password generation uses `Math.random()` in `UserService.generateTemporaryPassword()`, which is cryptographically weak.
- [S2] `mustChangePassword` is not enforced server-side for protected access.
- [S2] `emailVerifiedAt` is not used to gate login or sensitive operations.
- [S2] Tenant resolution uses `x-tenant-id` header in login, which is insecure if not hardened by tenant middleware.
- [S3] Service classes bypass repository constraints with direct `PrismaService` injection, increasing attack surface.
- [S3] `JwtStrategy` session lookup omits `tenantId` scope on session validation.
- [S4] Lack of HTTP security middleware such as `Helmet`, CORS allowlist, and rate limiting around auth endpoints.

## 4. Root Cause Analysis
- The security design is strong on paper but partially unimplemented in code, especially around refresh token state binding.
- Service-level convenience overrides repository discipline, leading to inconsistent validation and increased risk.
- Certain blueprint rules were deferred to future phases and are now security-critical gaps.
- Weak random generation for temporary passwords indicates a hidden implementation risk in business code.

## 5. Recommended Fix
- Enforce refresh-token state by validating raw refresh tokens against stored hashes before rotation (implemented).
- Harden `revokeSession()` and refresh path to require active, non-expired, non-revoked sessions.
- Replace temporary password generation with a crypto-secure generator.
- Implement server-side enforcement of `mustChangePassword` and `emailVerifiedAt` where required by the blueprint.
- Migrate tenant resolution to middleware and remove header-based tenant scoping for prod.
- Add HTTP security middleware and auth endpoint rate limiting in the next release.

## 6. Architectural Impact
- These fixes improve auth security without changing the API contract for clients.
- Session and token fixes are central to multi-device support and replay protection.
- Password generation and tenant handling affect user onboarding and tenant isolation.
- A stronger security foundation reduces later remediation costs and protects enterprise users.

## Architecture Validation (Phase S1.2)

- Authentication & refresh token validation:
	- Refresh rotation and ownership verification implemented and use repository-level atomic rotation (`prisma.$transaction`) ✅
	- `SessionService` uses `SessionRepository.revokeSessionChain` which is transactionally safe ✅

- Remaining security cautions:
	- Some RBAC operations (permission assign/remove, role delete) do validation then mutate without a single DB transaction — potential TOCTOU window; recommend transactionalize these flows ⚠️
	- Certain components (JwtStrategy, PermissionGuard) access Prisma directly; ensure all lookups include tenant scoping and do not expose sensitive selects.

- Immediate hardening tasks:
	- Add DB-level tenant scoping to mutations that use `where: { id }` without `tenantId`.
	- Add a CI rule to detect `prisma.` usage in service-layer files.
