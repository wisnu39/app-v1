# Auth Policy Update

## 1. Policy Changes

S1.5 introduces server-side enforcement for two account security policies that previously existed only as response data or were not enforced in the request lifecycle.

### 1.1 `mustChangePassword`
- Protected endpoints now reject authenticated users whose `mustChangePassword` flag is true.
- This ensures users cannot continue normal access until the password has been changed.

### 1.2 `emailVerified`
- Protected endpoints now reject authenticated users whose email verification flag is false.
- This closes the gap where verification status was available in runtime context but not enforced.

## 2. Enforcement Strategy

- `JwtStrategy` now resolves the required security flags from the database and attaches them to the authenticated request.
- `SecurityPolicyGuard` applies the policy decisions centrally for protected routes.
- The `/auth/me` endpoint is intentionally exempt so the account can still be surfaced for onboarding and verification flows.

## 3. Compatibility Notes

- No JWT payload changes were introduced.
- No endpoint contract changes were made.
- The auth response contract remains intact; only the server-side enforcement of protected operations changed.

## 4. Security Impact

- Users cannot bypass password-change or verification requirements by calling protected routes directly.
- Downstream services receive a verified `request.user` context that includes the policy state needed for authorization decisions.
- The policy enforcement remains centralized and easier to audit than route-level checks.

## 5. Files Updated

- `src/core/auth/guards/security-policy.guard.ts`
- `src/core/auth/strategies/jwt.strategy.ts`
- `src/core/auth/types/auth-user.type.ts`
- `src/modules/users/controllers/users.controller.ts`
- `src/modules/rbac/controllers/rbac.controller.ts`

## 6. Validation Status

- Focused guard and security service tests passed.
- Full workspace validation is still pending and must be rerun after the documentation update to confirm lint, type-check, build, and test commands are clean.
