# COMPLIANCE STATUS

Overall Status: ✅ S1.4 HARDENING COMPLETE

## Rule
All queries must include `tenantId` and exclude soft-deleted rows.

## Current Implementation
Repository methods remain tenant-scoped and continue to filter on `deletedAt: null`. The S1.4 work did not change the repository boundary itself, but the request tenant context is now centralized so downstream queries always receive a trusted tenant scope.

## Compliance Status
✅ COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Direct service queries without consistent tenant scoping can leak or mutate data across tenants.

## Required Fix
Continue to keep tenant-scoped repository APIs as the enforcement boundary and avoid adding new direct Prisma access in services.

---

## Rule
Controllers must never accept tenantId from body, query, or params.

## Current Implementation
`AuthController.login()` no longer extracts tenantId from `x-tenant-id`. Tenant context is resolved by `TenantResolverMiddleware` and attached to the request as immutable `req.tenant` state before the controller is invoked.

## Compliance Status
✅ COMPLIANT

## Risk Level
S1

## Why This Is Dangerous
Header-based tenant resolution is not a secure enterprise pattern and violates the blueprint requirement.

## Required Fix
Keep all tenant resolution in middleware and ensure no controller or service accepts tenant overrides from client-controlled inputs.

---

## Rule
Tenant isolation must be enforced in auth and RBAC flows.

## Current Implementation
`JwtStrategy` now receives the request and rejects any token whose `tenantId` does not match the resolved `req.tenant.tenantId`. This closes the gap between the JWT payload and the request context and makes tenant trust immutable for authenticated requests.

## Compliance Status
✅ COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Implicit tenant assumptions can fail if token or role data is compromised.

## Required Fix
Preserve the explicit request-vs-token tenant validation and consider adding tenant-aware RBAC checks if future permission logic expands beyond `roleId`.

---

## Rule
Role assignment and permissions must not cross tenants.

## Current Implementation
Role and permission operations remain tenant-scoped in repository/service methods. The new request tenant context reduces one of the main drift paths, but the remaining direct transaction paths in RBAC should still be reviewed during the next audit pass.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
If tenant scoping is missed in a direct transaction, a permission could be applied to the wrong role or tenant.

## Required Fix
Continue to audit RBAC mutation paths and convert any remaining direct transaction lookups to tenant-scoped repository APIs where practical.

---

## S1.4 Change Summary
- Added `TenantResolverMiddleware` and `TenantResolverService` to resolve tenant context from the request host and attach it to `req.tenant`.
- Removed `x-tenant-id` usage from `AuthController.login()`.
- Updated `JwtStrategy` to enforce `tenantId` equality between the resolved request context and the JWT payload.
- Added a unit test covering hostname-based tenant resolution and localhost fallback behavior.
