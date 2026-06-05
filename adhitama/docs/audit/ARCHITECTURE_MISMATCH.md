# COMPLIANCE STATUS

Overall Status: ⚠ PARTIALLY COMPLIANT

## Rule
Architecture must enforce repository cadence and avoid business logic or direct Prisma in service/guard layers.

## Current Implementation
`AuthService`, `UserService`, and `RbacService` all inject `PrismaService`. `PermissionGuard` also queries Prisma directly rather than using a repository layer.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
This creates hidden drift from the clean architecture blueprint and makes it harder to track tenant/RBAC rules consistently across the app.

## Required Fix
Refactor these services so all DB access flows through repository abstractions. Consider adding guard-specific repository APIs for RBAC checks.

---

## Rule
JwtStrategy must be the single source of truth for auth validation and no auth logic should be duplicated elsewhere.

## Current Implementation
JwtStrategy validates user and session state, but `AuthService` still performs authorization-related checks on `status`, `deletedAt`, and `emailVerifiedAt` during login.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Duplicated auth validation increases maintenance burden and may lead to inconsistent outcomes between token validation and login flow.

## Required Fix
Centralize as much auth validation as possible in strategy/guard sequences and keep login flow limited to credential validation and token/session orchestration.

---

## Rule
Module boundaries require `core/` to remain reusable and business-agnostic, with business modules depending on core.

## Current Implementation
The module layout is correct, but `common/guards/permission.guard.ts` references Prisma directly, which erodes the core/business layering.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
If guard logic becomes business-specific, it will erode the reusable nature of `core/` and create implicit dependencies.

## Required Fix
Move RBAC query logic to a repository or dedicated core RBAC service, keeping `PermissionGuard` as a thin enforcement layer.

---

## Rule
Future scalability requires avoidance of N+1 queries and use of query objects/reuse selectors.

## Current Implementation
`RbacService.listRoles()` uses repeated calls to `findRoleById()` inside a map, causing potential N+1 role resolution. `UserRepository` applies good select discipline but some services still issue direct queries.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S3

## Why This Is Dangerous
Unoptimized role enrichment and direct service queries will slow the app as tenant workload grows.

## Required Fix
Refactor role listing to return fully hydrated role views in a single repository query and eliminate direct Prisma access from services.
