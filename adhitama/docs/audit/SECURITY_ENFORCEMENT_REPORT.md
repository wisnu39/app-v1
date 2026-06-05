# Security Enforcement Report

## 1. Scope

This report documents the S1.5 security enforcement work completed for the API service. The implementation focuses on server-side enforcement of account security policy, authenticated request hardening, and Redis-backed security telemetry without changing the public endpoint contracts or the JWT payload structure.

## 2. What Was Implemented

### 2.1 Centralized security policy enforcement
- Added `SecurityPolicyGuard` to enforce two server-side account policies for protected endpoints:
  - `mustChangePassword`
  - `emailVerified`
- Wired the guard into the protected user and RBAC controller classes so access control is enforced centrally.
- Kept `/auth/me` exempt so onboarding and profile fetch flows remain usable.

### 2.2 Runtime auth context enrichment
- Extended `JwtStrategy` to load and attach the user security state to `request.user`:
  - `mustChangePassword`
  - `emailVerified`
- Preserved the existing JWT payload shape and repository boundaries.
- Maintained a strict tenant consistency check between the request tenant context and the JWT payload.

### 2.3 Security policy propagation
- Expanded `AuthUser` so downstream guards can enforce account policy decisions using authenticated request context.
- Exported and registered `SecurityPolicyGuard` in the core auth module.

## 3. Enforcement Behavior

### 3.1 Protected route behavior
- Requests to protected business routes are rejected when:
  - `mustChangePassword === true`
  - `emailVerified === false`
- The rejection is returned as a generic `ForbiddenException` to avoid leaking security state details.

### 3.2 Authorization flow
1. Access token is validated by `JwtStrategy`.
2. User security flags are resolved from the user record and attached to `request.user`.
3. `SecurityPolicyGuard` checks the request context and blocks access when policy is not satisfied.
4. Existing RBAC permission checks continue to run as the next layer of enforcement.

## 4. Files Updated

- `src/core/auth/guards/security-policy.guard.ts`
- `src/core/auth/types/auth-user.type.ts`
- `src/core/auth/strategies/jwt.strategy.ts`
- `src/core/auth/auth.module.ts`
- `src/core/auth/index.ts`
- `src/modules/users/controllers/users.controller.ts`
- `src/modules/rbac/controllers/rbac.controller.ts`

## 5. Validation

- Focused Jest verification passed for the new guard and security service tests.
- File-level diagnostic checks reported no TypeScript errors on the modified files.
- Full validation commands are still required to confirm the entire API workspace remains clean after the final S1.5 changes.

## 6. Residual Risk

- The current policy guard is intentionally scoped to protected routes and does not alter login behavior.
- Additional policy enforcement can be added later for other high-risk actions if the security blueprint requires it.
