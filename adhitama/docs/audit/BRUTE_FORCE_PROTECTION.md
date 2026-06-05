# Brute-Force Protection

## 1. Objective

This document records the Redis-backed brute-force mitigation implemented for authentication endpoints. The goal is to reduce credential stuffing, limit repeated login attempts, and create a reliable security telemetry trail without changing the shape of the auth API responses.

## 2. Controls Implemented

### 2.1 Login throttling and lockout
- Added `AuthSecurityService` to protect login flows with Redis-backed rate limiting.
- Login failures are tracked per tenant + identifier and per tenant + IP address.
- The service applies separate thresholds for:
  - identifier-based failures
  - IP-based failures
- Once thresholds are exceeded, a temporary lockout key is set for a fixed TTL.

### 2.2 Refresh throttling and lockout
- Added equivalent protection for refresh flows.
- Refresh failures are tracked by IP address and a temporary refresh lockout is applied after the configured threshold is reached.

### 2.3 Suspicious activity detection
- When lockout thresholds are hit, the service records a structured suspicious event.
- The suspicious event payload includes:
  - tenant ID
  - identifier
  - IP address
  - user agent
  - failure counts

### 2.4 Security event logging foundation
- Structured security events are emitted as JSON payloads and written to Redis list storage under `auth:security:events`.
- The list is trimmed to the most recent 200 events.
- Event logging is best-effort and does not interrupt auth flows.

## 3. Redis Key Strategy

### Login keys
- `auth:security:login:fail:identifier:{tenantId}:{identifier}`
- `auth:security:login:fail:ip:{tenantId}:{ip}`
- `auth:security:login:lock:identifier:{tenantId}:{identifier}`
- `auth:security:login:lock:ip:{tenantId}:{ip}`

### Refresh keys
- `auth:security:refresh:fail:ip:{ip}`
- `auth:security:refresh:lock:ip:{ip}`

### Event stream
- `auth:security:events`

## 4. Auth Flow Integration

### Login
- `AuthService.login()` now invokes `preflightLogin()` before checking credentials.
- Failed logins call `recordLoginFailure()`.
- Successful logins call `recordLoginSuccess()` to clear counters and lockouts.

### Refresh
- `AuthService.refreshTokens()` now invokes `preflightRefresh()` before processing the refresh token.
- Failed refresh requests call `recordRefreshFailure()`.
- Successful refreshes call `recordRefreshSuccess()`.

## 5. Failure Handling

- If Redis is unavailable, the security service degrades gracefully and does not block the request path.
- A preflight lockout raises an HTTP `429` response with a generic message.
- Login and refresh failures continue to return the existing generic auth error behavior.

## 6. Operational Notes

- Current thresholds are intentionally conservative and can be tuned if monitoring shows a different risk profile.
- The current implementation stores only structured metadata needed for incident response and abuse detection.
- The event stream is a foundation for future dashboards and alerting.

## 7. Files Updated

- `src/modules/auth/services/auth-security.service.ts`
- `src/modules/auth/services/auth.service.ts`
- `src/modules/auth/auth.module.ts`
