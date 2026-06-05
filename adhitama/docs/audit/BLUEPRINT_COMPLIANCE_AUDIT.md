# COMPLIANCE STATUS

Overall Status: ⚠ PARTIALLY COMPLIANT

## Rule
AGENT.md requires strict controller → service → repository separation with tenant-scoped data access and clean architecture.

## Current Implementation
Controllers are thin and delegate to services. However, `AuthService`, `UserService`, and `RbacService` inject `PrismaService` directly and perform queries beyond repository responsibilities.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Direct Prisma access in services bypasses repository query discipline, increasing hidden coupling, inconsistent tenant filtering, and making future refactors harder.

## Required Fix
Refactor business services to use repository methods for all database access. Reserve `PrismaService` for repository layer only.

---

## Rule
Clean Architecture / DDD-lite rules require modules to depend inward only: controller → service → repository → infrastructure.

## Current Implementation
Module structure is present and generally correct. Nonetheless, service-level direct DB calls and guard-level Prisma queries introduce cross-layer violations.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Layer violations create hidden architecture drift and make it difficult to enforce tenant, RBAC, and audit policies consistently.

## Required Fix
Enforce the dependency direction by moving all Prisma queries in services/guards into repository or dedicated infrastructure abstractions.

---

## Rule
Blueprint demands tenant isolation through JWT payload, repository filtering, and no tenantId in controller body/query.

## Current Implementation
TenantId is passed in JWT and repositories generally filter by tenantId. However `AuthController.login()` still extracts tenant ID from header `x-tenant-id`.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S1

## Why This Is Dangerous
Header-based tenant extraction is an unsafe, ad hoc path that can be spoofed and violates the blueprint rule requiring tenant resolution from authenticated context.

## Required Fix
Replace header-based tenant extraction with centralized tenant middleware or tenant resolver, using `@CurrentUser()` or a request context.

---

## Rule
Blueprint requires security-first behavior for auth, profile enforcement, and RBAC gating.

## Current Implementation
Auth flow implements access/refresh architecture, but `mustChangePassword` and email verification are only returned as flags, not enforced by guards.

## Compliance Status
❌ NON-COMPLIANT

## Risk Level
S1

## Why This Is Dangerous
Security flags that are not enforced server-side leave unverified or bypassed accounts able to access protected resources.

## Required Fix
Implement guard-level enforcement for `mustChangePassword` and email verification, and enforce onboarding/profile completion before granting full app access.

---

## Rule
Blueprint requires enterprise scalability: no N+1 in hot paths, cacheable RBAC checks, and repository query discipline.

## Current Implementation
PermissionGuard performs a DB count lookup on every guarded request. `RbacService.listRoles()` calls `findRoleById()` in a loop, causing potential N+1.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
Per-request RBAC DB lookups and unbounded role enrichment will slow the app under load and make horizontal scaling harder.

## Required Fix
Add caching or pre-joined RBAC lookup for permissions, and avoid listRoles N+1 patterns by returning complete role views in a single query.

---

## Rule
Blueprint and docs require enterprise folder structure and shared core modules.

## Current Implementation
Folder structure matches the blueprint closely: `core/`, `modules/`, `common/`, `config/`, `infrastructure/`.

## Compliance Status
✅ FULLY COMPLIANT

## Risk Level
S4

## Why This Is Dangerous
N/A — structure is aligned.

## Required Fix
Continue maintaining this structure as modules grow.
