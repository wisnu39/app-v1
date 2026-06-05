# Architecture Review

## 1. Current State
- The backend is structured as a modular monolith with `core/`, `modules/`, `config/`, and `infrastructure/`.
- App bootstrap includes global modules and validation.
- The stack is NestJS + Prisma + Redis, and the code comments emphasize clean architecture.

## 2. Good Implementation
- Module boundaries are clear in many places: auth, users, rbac, core database.
- Global modules are imported once in `AppModule` and exported for reuse.
- Controllers are generally thin and delegate to service layer.
- DTO validation and express guards are used consistently.

## 3. Problems Found
- [S2] Service layer bypasses repository layer in multiple modules by injecting `PrismaService` directly.
- [S2] `PrismaService` is documented as repository-only, but `AuthService`, `UserService`, and `RbacService` ignore that contract.
- [S3] Some service logic still contains low-level query decisions and entity-specific DB validation.
- [S3] Tenant logic is not fully centralized; auth still parses `x-tenant-id` header in controller.
- [S3] Comments describe future architecture improvements that are not yet implemented, creating drift.

## 4. Root Cause Analysis
- The architecture blueprint is sound, but enforcement is weak in later-phase service implementations.
- Partial implementation of repository methods causes service developers to take shortcuts with direct Prisma calls.
- Tenant and security middleware remain unimplemented, so the code relies on ad-hoc patterns.

## 5. Recommended Fix
- Reconcile service/repository boundaries with a refactor plan prioritizing critical direct-DB cases.
- Implement tenant resolution middleware and use it consistently before business service execution.
- Maintain the current module layout, but add repository methods for missing data access patterns.
- Use code reviews and architecture checks to ensure future services do not bypass repository filters.

## 6. Architectural Impact
- Correcting boundary violations will make future feature modules more stable and easier to test.
- Tenant isolation, security, and RBAC all depend on this architectural consistency.
- The impact is cross-cutting: auth, user management, RBAC, and future financial workflows all benefit.

## Architecture Validation (Phase S1.2)

- Transactions validated:
	- `SessionRepository.revokeSessionChain`: uses `prisma.$transaction()` ✅
	- `SessionService.rotateSession` / `AuthService.refreshTokens`: rotation flow delegates to repository transaction ✅
	- Multi-step RBAC flows (`assignPermissions`, `removePermission`, `deleteRole`) currently lack an explicit DB transaction at service/repository boundary — RECOMMEND move validation+mutations into a repository transaction or expose a transactional repository API ⚠️

- Repository boundary findings:
	- Repositories correctly encapsulate most tenant-scoped lookups and reuse `select` objects for predictable fields.
	- Several mutation paths still use `where: { id }` with `prisma.update()` / `prisma.delete()` (users, roles, auth.lastLogin) — while pre-checks exist, prefer `updateMany`/`deleteMany` with `tenantId` to enforce tenant-scoping at DB level ⚠️

- Architecture violations remaining:
	- `RbacService.assignPermissions` / `removePermission`: missing explicit transactional guard for validate+mutate sequence.
	- Several repository mutation calls use unique-id deletes/updates without tenant in the `where` clause (see TECHNICAL_DEBT for file list).
	- `JwtStrategy` and some guards still call `PrismaService` directly for performance-sensitive lookups — acceptable if documented, but should be audited for tenant-safety.

- Recommendation summary:
	- Move multi-step mutation transactions into repository helper methods (transactional repository APIs).
	- Replace `where: { id }` updates/deletes with tenant-scoped `updateMany`/`deleteMany` where practical.
	- Add a lightweight architecture lint rule or CI check to detect `prisma.` in service files.
