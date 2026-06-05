---
name: s2-3-true-auth-e2e-security-validation
description: "Use when implementing S2.3 true auth E2E security validation with real PostgreSQL, Redis, Supertest, replay protection, tenant isolation, audit validation, and full pipeline verification."
---

# S2.3 — True Auth E2E Security Validation

## Purpose

Execute real security end-to-end validation for auth flows using the real Nest application, real PostgreSQL, real Redis, real guards/interceptors/middleware, Supertest, and deterministic cleanup.

## Scope

This skill is for the S2.3 security hardening increment in Adhitama. Stop broad helper refactors and focus on real infrastructure-backed validation.

## Required Outcome

Create and validate a real auth E2E security suite that proves:
- login, refresh, logout, email verification, forgot password, throttling, and security guard behavior
- Redis-backed brute force and cooldown enforcement with no mocks
- Prisma-backed transactional token handling and session revocation
- tenant isolation and replay protection under concurrent requests
- audit metadata, request correlation, IP, and user-agent capture

## Workflow

### 1. Freeze abstraction work

- Do not expand helper abstraction layers for this phase.
- Do not add new mock-heavy scaffolding.
- Keep existing shared utilities intact unless they are required for real E2E execution.
- Focus on real behavior and infrastructure-backed validation.

### 2. Create real E2E structure

Create the following structure under the API workspace:

- `src/modules/auth/e2e/auth-login.e2e-spec.ts`
- `src/modules/auth/e2e/auth-refresh.e2e-spec.ts`
- `src/modules/auth/e2e/auth-verification.e2e-spec.ts`
- `src/modules/auth/e2e/auth-forgot-password.e2e-spec.ts`
- `src/modules/auth/e2e/auth-security.e2e-spec.ts`
- `src/modules/auth/e2e/auth-throttling.e2e-spec.ts`
- `src/modules/auth/e2e/helpers/auth-e2e-bootstrap.ts`
- `src/modules/auth/e2e/helpers/auth-e2e-fixtures.ts`
- `src/modules/auth/e2e/helpers/auth-e2e-cleanup.ts`
- `src/modules/auth/e2e/helpers/redis-test.helper.ts`
- `src/modules/auth/e2e/helpers/prisma-test.helper.ts`

### 3. Build real E2E bootstrap

Build reusable bootstrap code that:
- creates a real `INestApplication`
- uses real validation pipes, guards, interceptors, middleware, and global filters
- connects to real PostgreSQL and Redis test instances
- uses `Supertest` against the real HTTP layer
- avoids mocked auth services, mocked Redis, and mocked Prisma

### 4. Create isolated test infrastructure

Add a dedicated test environment for E2E execution:
- `docker-compose.test.yml`
- `postgres-test` service
- `redis-test` service
- repeatable schema/data isolation
- deterministic cleanup
- safe separation from production databases

### 5. Implement required auth E2E flows

#### Login
- successful login
- invalid credentials
- disabled user rejection
- forced password change behavior
- unverified email rejection

#### Refresh
- refresh success
- refresh replay rejection
- revoked refresh token rejection
- expired refresh token rejection

#### Logout
- logout success
- revoked session rejection

### 6. Validate email verification

Test real verification behavior:
- valid verification
- expired token rejection
- reused token rejection
- resend invalidates previous token
- concurrent verification attempts with replay protection
- cross-tenant verification rejection

Critical requirement: use concurrent requests to prove single-use behavior.

### 7. Validate forgot password

Test real password reset behavior:
- request reset success
- reset success
- expired token rejection
- reused token rejection
- resend invalidates old token
- reset revokes sessions
- invalid token rejection
- cross-tenant reset rejection

Critical requirement: prove session invalidation and transactional behavior.

### 8. Validate Redis-backed security controls

Use real Redis behavior to validate:
- brute-force counters
- throttling windows
- lock expiration
- retry windows
- cooldown expiration
- concurrent attempts

Required proofs:
- multiple failed logins trigger lockout
- lock expires and recovery works
- concurrent attempts are handled correctly

### 9. Validate security invariants

Prove all of the following with real execution:
1. Tenant isolation
   - Tenant A cannot verify Tenant B tokens
   - Tenant A cannot reset Tenant B passwords
   - Tenant A cannot refresh Tenant B sessions
2. Replay protection
   - single-use tokens cannot be reused
3. Session invalidation
   - password reset revokes active sessions
4. Security policy enforcement
   - forced password change blocks protected routes
5. Email verification enforcement
   - unverified users are blocked correctly

### 10. Validate audit and observability

Check that:
- audit events are emitted
- request metadata is captured
- IP and user-agent are preserved
- security events are categorized correctly
- correlation ID support is present if required

### 11. Run full validation

Run the full pipeline:
- `npm run lint`
- `npm run type-check`
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run build`
- `npm test -- --runInBand`

If failures appear, fix them directly and preserve strict typing and lint rules.

## Non-Negotiable Rules

- Use real `INestApplication` and `Supertest`.
- Use real PostgreSQL and Redis.
- Use real guards, middleware, interceptors, and persistence layers.
- No mocked Redis in E2E.
- No mocked Prisma in E2E.
- No fake E2E behavior.
- Preserve endpoint contracts, JWT payload structure, audit logging, and tenant isolation.

## Completion Criteria

The work is complete only when:
- real E2E files exist under the required structure
- real bootstrap and helpers exist for infrastructure-backed runs
- test infrastructure is isolated and repeatable
- required auth/security flows are covered
- concurrent replay and tenant isolation are proven
- Redis throttle and lock behavior is observed in real execution
- full validation commands are executed and reported
- documentation is created under `docs/audit/`

## Suggested Execution Checklist

1. Create the E2E folder structure and helper modules.
2. Implement real bootstrap and test environment helpers.
3. Add the real E2E test files.
4. Add isolated PostgreSQL and Redis test environment.
5. Execute the flows with real infrastructure.
6. Capture failing or passing validation evidence.
7. Update audit documentation.
8. Summarize remaining risks and next security phase.
