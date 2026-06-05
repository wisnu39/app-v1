import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.type';

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 *
 * Returns request.user as set by JwtStrategy.validate().
 * Must be used on endpoints protected by @UseGuards(JwtAuthGuard).
 *
 * Rules — this decorator ONLY does:
 *   - Read request.user
 *   - Return it typed as AuthUser
 *
 * Rules — this decorator NEVER does:
 *   - Query the database
 *   - Inject any service
 *   - Transform or add fields
 *   - Validate or filter the user object
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: AuthUser) {
 *     return user; // { id, tenantId, sessionId, roleId }
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();

    return request.user;
  },
);
