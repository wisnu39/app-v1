# AUTH TEST ARCHITECTURE

This document summarizes the target auth testing architecture, taxonomy, shared infrastructure, and migration plan.

## Taxonomy

- `*.unit.spec.ts` for isolated service/class testing with mocked dependencies.
- `*.module.spec.ts` for Nest `TestingModule` wiring and partial integration.
- `*.integration.spec.ts` for repository-backed integration coverage.
- `*.e2e-spec.ts` for real HTTP, DB, Redis, and middleware validation.

## Shared Utilities

- Builders under `src/test-utils/builders/`
- Fixtures under `src/test-utils/fixtures/`
- Assertions under `src/test-utils/assertions/`
- Test bootstrap under `src/test-utils/bootstrap/`
- Reusable typed helper types under `src/test-utils/types/`
