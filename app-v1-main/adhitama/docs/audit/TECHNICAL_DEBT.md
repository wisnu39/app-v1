# Technical Debt

## 1. Current State
- The codebase has a strong blueprint, but several implementation gaps remain.
- Security and architecture comments outpace actual code in some modules.

## 2. Good Implementation
- Foundational security requirements are documented and partly implemented.
- Repository and module structure are present, even if not fully enforced.
- Global validation and exception handling are established.

## 3. Problems Found
- [S2] Service layer direct Prisma usage is technical debt that weakens the clean architecture contract.
- [S2] `SessionRepository.findByHash()` is unused, indicating unfinished auth discipline.
- [S2] `UserService.assertNotLastOwner()` is not transactionally safe, risking race conditions.
- [S2] Email verification and `mustChangePassword` gating are deferred and remain technical debt.
- [S3] No security middleware such as `Helmet`, CORS, or rate limiting is present yet.
- [S3] Role and permission validation is on-demand and has no cache layer, which may slow future scaling.
- [S4] Login email normalization is missing, causing a usability edge case.
- [S4] Audit logging is marked TODO in many service flows.

## 4. Root Cause Analysis
- The team prioritized feature scaffolding and phase milestones over strict architectural enforcement.
- Some blueprint requirements were documented as future work, leaving relevant code paths incomplete.
- Incomplete repository APIs caused services to implement custom queries, growing debt over time.

## 5. Recommended Fix
- Allocate a cleanup sprint for repository discipline and auth refresh flow completion.
- Implement missing blueprint security features in a prioritized order.
- Close gaps between documentation and actual runtime behavior by adding tests and audits.
- Track TODOs in a formal backlog so they are not forgotten.

## 6. Architectural Impact
- Reducing technical debt now will make later financial and rental workflows easier to secure.
- A cleaner service/repository contract improves maintainability and reduces the chance of security regressions.
- These changes support enterprise-grade scaling and auditability.

## Architecture Validation (Phase S1.2) — Technical Debt Addendum

- Remaining technical debt discovered during S1.2:
	- Several repository mutations use `where: { id }` with `prisma.update()`/`delete()` instead of tenant-scoped `updateMany`/`deleteMany` (user.repository, rbac.repository, auth.repository). Even when pre-checks exist, prefer in-query tenant scoping to avoid race conditions.
	- RBAC assign/remove permission flows should be transactional to avoid partial mutation after validation.
	- `JwtStrategy` and some guards still access `PrismaService` directly — document and harden tenant-scope checks.
	- Linting dev-deps are missing in this execution environment; ensure CI installs devDependencies before lint step.

- Suggested next cleanup sprint items:
	1. Migrate RBAC validate+mutate flows into repository-level transactions.
	2. Convert single-id updates/deletes to tenant-scoped updateMany/deleteMany or transactional patterns.
	3. Add CI rule to detect `prisma.` usage in `services/` files.
	4. Replace `Math.random()` based temporary password generator with `crypto.randomBytes` implementation.
