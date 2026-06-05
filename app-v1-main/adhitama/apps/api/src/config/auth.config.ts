import { registerAs } from '@nestjs/config';

/**
 * Auth Config — JWT and session security configuration.
 *
 * Namespace : 'auth'
 * Access    : configService.get<AuthConfig>('auth')
 *
 * Security requirements (SECURITY_DESIGN.md):
 *   - Secrets MUST be at minimum 32 characters (256-bit entropy)
 *   - Access token: short-lived (default 15m) — stateless verification
 *   - Refresh token: longer-lived (default 7d) — stateful via Session table
 *   - Both secrets are distinct — compromising one does not compromise the other
 *
 * Token lifecycle awareness:
 *   - Access token  : verified via JwtStrategy on every request (stateless)
 *   - Refresh token : verified via TokenService + Session DB lookup (stateful)
 *   - Refresh token rotation: each use issues a new pair, old pair is revoked
 *
 * mustChangePassword awareness:
 *   - This field is security-sensitive — not merely informational
 *   - Users with mustChangePassword: true receive a valid access token
 *   - However, the token payload carries this state for downstream enforcement
 *   - Future: PermissionGuard will inspect this flag before granting access
 *
 * emailVerifiedAt awareness:
 *   - Treated as security-sensitive, not merely informational
 *   - Future: certain access scopes may require verified email
 *   - Architecture must not strip or ignore this field in auth flows
 *
 * All values here are validated by validationSchema at bootstrap.
 * Non-null assertions are safe — Joi enforces presence before this runs.
 */
export interface AuthConfig {
  /** JWT access token signing secret. Minimum 32 chars. */
  accessTokenSecret: string;
  /** Access token expiry. Short-lived. Default: '15m'. */
  accessTokenExpiresIn: string;
  /** JWT refresh token signing secret. Minimum 32 chars. Distinct from access secret. */
  refreshTokenSecret: string;
  /** Refresh token expiry. Longer-lived. Default: '7d'. */
  refreshTokenExpiresIn: string;
}

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    accessTokenSecret: process.env['JWT_ACCESS_SECRET'] as string,
    accessTokenExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    refreshTokenSecret: process.env['JWT_REFRESH_SECRET'] as string,
    refreshTokenExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  }),
);
