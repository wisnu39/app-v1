# Audit Logging Implementation

## Scope

This document captures the Phase P1 audit logging foundation for the Adhitama API.

## Implementation Summary

- Added a dedicated `AuditModule` with a Prisma-backed repository, service, metadata helper, constants, and typed request models.
- Wired the audit module into the root application module plus the auth, user, and RBAC feature modules.
- Emitted best-effort audit events for:
  - `LOGIN_SUCCESS`
  - `LOGIN_FAILED`
  - `TOKEN_REFRESH`
  - `LOGOUT`
  - `LOGOUT_ALL`
  - `USER_CREATED`
  - `USER_UPDATED`
  - `USER_STATUS_CHANGED`
  - `USER_DELETED`
  - `ROLE_CREATED`
  - `ROLE_UPDATED`
  - `ROLE_DELETED`
  - `PERMISSIONS_ASSIGNED`
  - `PERMISSION_REMOVED`

## Design Notes

- Writes are non-blocking via `AuditService.fireAndForget()`.
- Failures are swallowed and logged by the audit service, so primary auth, user, and RBAC flows remain available.
- Metadata is sanitized before persistence to strip sensitive or high-risk fields such as passwords, raw tokens, authorization headers, and nested secrets.
- All audit writes preserve tenant scoping and include request metadata where available.

## Integration Points

- `AuthService` now emits login, failure, refresh, logout, and logout-all audit events.
- `UserService` emits user lifecycle audit events.
- `RbacService` emits role and permission mutation audit events.
- Controllers pass request IP, user-agent, and session identifiers into the service layer.

## Validation

- Type checking and build checks are required after any audit wiring change.
- Audit writes are intentionally best-effort and must never break authentication or admin workflows.
