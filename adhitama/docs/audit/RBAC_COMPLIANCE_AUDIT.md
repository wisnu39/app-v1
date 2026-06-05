# COMPLIANCE STATUS

Overall Status: ⚠ PARTIALLY COMPLIANT

## Rule
RBAC must use permission metadata, PermissionGuard, and system role protection.

## Current Implementation
`RbacController` applies `@UseGuards(JwtAuthGuard, PermissionGuard)` and explicit `@Permission()` metadata on all endpoints. `PermissionGuard` checks `roleId` permissions via DB count.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
N/A for current guard semantics. Guard-level DB checks are correct but may require caching under load.

## Required Fix
Add Redis-cached permission lookups in a future scaling phase.

---

## Rule
System roles `OWNER` and `SUPER_ADMIN` must be protected from modification, deletion, and permission reassignment.

## Current Implementation
`RbacService` asserts system roles cannot be renamed, deleted, or have permissions changed based on `SYSTEM_ROLE_NAMES`.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Service-level protection is solid, but there is no repository or DB-level invariant preventing accidental direct mutation.

## Required Fix
Add repository-level checks or DB constraints to make system role protection resilient to future code changes.

---

## Rule
Permission format must be dynamic and DB-driven, not hardcoded.

## Current Implementation
Permissions are stored in a `Permission` table and looked up via `rolePermission` joins. Guard uses metadata arrays.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
N/A, but system roles and permission assignment should continue to avoid hardcoded keys.

## Required Fix
Continue using DB-driven permission definitions.

---

## Rule
Role assignments must respect tenant boundaries and prevent cross-tenant permission leakage.

## Current Implementation
Role operations are tenant-scoped in repository/service methods. `PermissionGuard` uses `roleId` only, assuming the token-bound role is tenant-scoped.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
If a token were forged or a roleId were reassigned incorrectly, explicit tenant checks inside RBAC guard would provide stronger isolation.

## Required Fix
Include explicit tenant scoping in permission lookups or validate `roleId`+`tenantId` in the guard.

---

## Rule
No auth logic duplication in RBAC enforcement layers.

## Current Implementation
RBAC enforcement is centralized in `PermissionGuard`. `RbacService` handles changes and system-role rules; controllers are thin.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S4

## Why This Is Dangerous
N/A

## Required Fix
Maintain the separation between enforcement (guards) and RBAC management (services).
