# Priority Fix Queue

## S1 — Critical Security
1. Refresh token replay vulnerability in `AuthService.refreshTokens()`
2. Session revocation bypass in `SessionService.revokeSession()`
3. Tenant isolation weakness from header-based `x-tenant-id` login flow
4. Direct service-level Prisma access bypassing repository contract
5. Weak temporary password generation using `Math.random()`

## S2 — High Priority
1. Missing `mustChangePassword` server-side enforcement
2. Missing email verification gating in auth flows
3. Race condition in owner deletion / last-owner protection
4. DTO/business-class inconsistency for login email normalization

## S3 — Medium Priority
1. Duplicate query logic and direct DB calls in service classes
2. `SessionRepository.findByHash()` incomplete/unused implementation
3. Architecture cleanup needed for repository discipline and tenant middleware

## S4 — Low Priority
1. Naming consistency between comments and runtime behavior
2. Documentation mismatch for future features vs current implementation
3. Security middleware and rate limiting still not implemented
