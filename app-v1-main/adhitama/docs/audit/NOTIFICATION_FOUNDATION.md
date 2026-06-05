# Notification Foundation

This document describes the Phase 2 notification and mail infrastructure foundation implemented for the Adhitama ERP API.

## What was added

- `NotificationModule` as a reusable business notification layer.
- `MailModule` as infrastructure for outbound email delivery.
- SMTP provider abstraction with a safe no-op fallback.
- Typed mail config under `src/config/mail.config.ts`.
- Environment validation for `MAIL_PROVIDER`, SMTP host/port/credentials, and sender address.
- Template rendering foundation for email verification, password reset, and generic notifications.
- Audit event `NOTIFICATION_SENT` for non-blocking notification dispatch tracing.

## Architecture

`AppModule` now imports `NotificationModule`.

`NotificationModule` depends on:
- `MailModule` for outbound delivery.
- `AuditModule` for notification dispatch audit records.

`MailModule` selects provider based on `mail.provider`:
- `smtp` → `SmtpMailProvider` using `nodemailer`
- `none` → `NoopMailProvider`

## Configuration

The following env vars are validated at bootstrap:

- `MAIL_PROVIDER` = `none|smtp` (defaults to `none`)
- `MAIL_SMTP_HOST`
- `MAIL_SMTP_PORT`
- `MAIL_SMTP_SECURE`
- `MAIL_SMTP_USERNAME`
- `MAIL_SMTP_PASSWORD`
- `MAIL_SMTP_FROM`
- `MAIL_SMTP_FROM_NAME`

## Security and resilience

- Mail driver selection is environment-driven, not hardcoded.
- When SMTP is unavailable, the provider falls back to a no-op implementation.
- Audit logging records notification send attempts as best-effort writes.
- Template rendering is deterministic and only interpolates allowed variables.
