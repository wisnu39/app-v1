# Phase 3 Audit

## 1. Current State
- User and RBAC modules exist and expose guarded endpoints.
- `PermissionGuard` and `@Permission()` decorator are implemented and used in users and rbac controllers.
- Business rules such as owner protection, tenant-scoped role creation, and soft delete behavior are partially enforced.
- RBAC service uses transactions for permission assignment and removal.

## 2. Good Implementation
- RBAC guard is stateless and uses OR permission logic via role-permission lookup.
- Users and RBAC controllers apply `JwtAuthGuard` and `PermissionGuard` consistently.
- Repository methods exist for user lookup, role lookup, and permission operations.
- Soft delete concept is present in user and session models, matching blueprint.
- Role assignment and permission changes are protected by system-role checks.

## 3. Problems Found
- [S2] Multiple service classes bypass repository layer and inject `PrismaService` directly.
- [S2] `UserService` uses direct Prisma calls for role validation and owner count checks.
- [S2] `RbacService` uses direct Prisma queries for role existence checks and transaction validation.
- [S3] `UserService.assertNotLastOwner()` is race-prone because it counts active owners then soft deletes without transactional locking.
- [S3] `findByHash()` in `SessionRepository` is unused, suggesting incomplete session validation design.
- [S4] Permission caching is not implemented, which is acceptable for Phase 3 but should be planned.

## 4. Root Cause Analysis
- Business services have gradually absorbed low-level DB queries, weakening the repository boundary.
- The repository API surface is incomplete for some service needs, leading to direct Prisma usage.
- Some business invariants are enforced outside transaction scope, creating race condition risk.
- The roadmap favors feature completion over strict boundary enforcement in later phases.

## 5. Recommended Fix
- Refactor service-level Prisma access into repository methods for role validation, owner count checks, and related queries.
- Extend repository APIs to support the required tenant-scoped validations cleanly.
- Convert owner-protection checks into a transaction or database-enforced constraint to prevent concurrent last-owner deletion.
- Remove unused session repository methods or complete the refresh-flow implementation that depends on them.

## 6. Architectural Impact
- Reasserting repository discipline improves maintainability and reduces future security drift.
- Transactional ownership checks protect tenant integrity and reduce rare but critical failure modes.
- These changes improve domain boundary clarity for user management, RBAC, and session state.
