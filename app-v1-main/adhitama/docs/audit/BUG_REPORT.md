# Bug Report

## 1. Current State
- The application has an auth flow, RBAC guard, and repository abstractions.
- Several implementation gaps exist between security/design docs and runtime behavior.

## 2. Good Implementation
- Token payload is minimal and aligned with blueprint.
- Session storage stores only refresh token hash.
- Guard and strategy separation is clean in the auth core.

## 3. Problems Found
- [S1] Refresh token replay vulnerability: `refreshTokens()` does not validate the refresh token against stored session hash.
- [S1] Session revocation bypass: `revokeSession()` can operate on non-active or already revoked sessions.
- [S1] Weak temporary password generation: `UserService.generateTemporaryPassword()` uses `Math.random()` instead of a cryptographically secure RNG.
- [S2] Direct Prisma usage in services violates repository discipline and may bypass consistent query filtering.
- [S2] `mustChangePassword` is returned but not enforced server-side, creating a client-side-only security signal.
- [S2] `emailVerifiedAt` is not used to gate login or protected flows.
- [S2] Tenant header extraction in `AuthController` is premature and can be spoofed if not protected by middleware.
- [S3] `SessionRepository.findByHash()` exists but is unused, revealing an incomplete implementation path.
- [S3] `UserService.assertNotLastOwner()` is not transactionally safe and can fail under concurrent owner deletion requests.

## 4. Root Cause Analysis
- The auth design is conceptually correct, but the refresh path implementation is incomplete.
- Business services have deviated from repository layer rules, causing hidden validation inconsistency.
- Security-critical flags are annotated in DTOs and responses but are not enforced.
- The current implementation reflects a phase-progress state rather than a finished secure release.

## 5. Recommended Fix
- Validate refresh token state against the stored session hash before rotation. (Implemented)
- Require active and non-revoked sessions for refresh operations.
- Migrate all direct `PrismaService` calls in services into repository methods.
- Enforce `mustChangePassword` and email verification via guards or service-level blocks.
- Replace insecure random password generation with `crypto.randomBytes` or equivalent secure source.
- Harden tenant resolution with middleware and remove header-based tenant lookup once target phase is ready.

## 6. Architectural Impact
- Fixing these bugs will improve auth security and reduce the risk of session replay.
- Repository discipline corrections will improve maintainability and reduce cross-module risk.
- Enforcing security flags server-side will prevent unauthorized access even if frontend behavior is bypassed.
