# Audit Module

## Purpose

The `AuditModule` provides an append-only audit logging foundation for enterprise workflows. It is designed to support security operations, compliance reporting, and future SIEM integration without changing API contracts.

## Responsibilities

- Persist audit events in the `audit_logs` table.
- Sanitize sensitive metadata before storage.
- Provide a single service for append-only audit writes.
- Keep the service layer decoupled from Prisma access.

## Security Rules

- Never store raw passwords, refresh tokens, or authorization headers.
- Sanitize nested metadata recursively.
- Treat audit writes as best-effort and non-blocking.
- Keep tenant scoping mandatory on every write.

## Future Extensions

- Query repository for tenant-scoped audit history.
- Add SIEM export or webhook delivery.
- Add correlation IDs and request IDs as metadata.
