import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects endpoints requiring authentication.
 *
 * Thin wrapper around Passport's AuthGuard('jwt').
 * Triggers JwtStrategy.validate() for all auth validation.
 * Contains NO business logic — validation is in JwtStrategy only.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: AuthUser) { ... }
 *
 * Returns 401 when:
 *   - No Authorization: Bearer <token> header present
 *   - Token is malformed, expired, or signature invalid
 *   - Any JwtStrategy validation step fails (user, status, session)
 *
 * Future guards that run AFTER this:
 *   - PermissionGuard        : checks RBAC permissions (Phase 2.2.9)
 *   - MustChangePasswordGuard: blocks endpoints until password changed
 *   - EmailVerifiedGuard     : blocks endpoints until email verified
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
