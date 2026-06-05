# Security Fix S1.1 — Refresh Token Replay Protection

## Goal
Implement secure refresh token ownership validation and atomic session rotation for refresh tokens.

## What changed
- Added `SessionRepository.findActiveSessionById()` to retrieve active session state and stored refresh token hash.
- Added `SessionRepository.revokeSessionChain()` to revoke the old session and create a replacement in a single transaction.
- Added `SessionService.verifyRefreshTokenOwnership()` to validate raw refresh tokens against the stored hash and reject stale/replayed tokens.
- Added `SessionService.rotateSession()` to perform token rotation atomically and deny concurrent replay attempts.
- Updated `AuthService.refreshTokens()` to use ownership validation and atomic rotation instead of separate revoke/create steps.

## Security improvements
- Refresh token rotation now requires:
  - valid JWT signature and expiry
  - active, non-revoked session state
  - raw refresh token matching the stored hashed token
- Detected replay or stale refresh token use triggers logout-all for the affected user.
- Concurrent refresh attempts cannot both succeed because old session revocation and new session creation are transactional.

## Testing scenarios
1. Valid refresh flow
   - raw refresh token signature is valid
   - session exists, active, and token matches stored hash
   - old session is revoked and a new session is created
   - response contains a fresh access token and refresh token

2. Stale or revoked session use
   - raw refresh token is valid but the session is revoked or expired
   - `verifyRefreshTokenOwnership()` revokes all user sessions and throws `UnauthorizedException`

3. Mismatched refresh token for active session
   - raw refresh token does not match the stored hash
   - `verifyRefreshTokenOwnership()` revokes all user sessions and throws `UnauthorizedException`

4. Concurrent replay attempt
   - first refresh request rotates the session successfully
   - second overlapping request fails when the old session is already revoked
   - the second request triggers logout-all and is rejected
