# Architecture Compliance Update

## Outcome
Architecture compliance was improved for S1.3 while preserving existing behavior.

## Compliance items confirmed
- Controller layer remains transport-only.
- Service layer remains orchestration-focused.
- Repository layer remains the only location for Prisma access.
- Tenant isolation behavior remains enforced in repository and service flows.
- No endpoint contracts, DTO shapes, or JWT payloads were modified.

## Changes aligned to blueprint
- Type safety was tightened in repository and test code.
- The permission decorator return type is explicit.
- The health controller uses safer status comparison logic.
- ESLint configuration now properly includes test files for project-based parsing.
- Missing lint dependency was added to restore the intended tooling path.

## Remaining architecture notes
- Seed scripts still use console logging, which is outside the runtime API boundary and only affects lint noise.
- The repository boundary remains intact; no direct Prisma access was reintroduced into the service layer.
- Current changes do not add new business features or alter tenancy resolution behavior.
