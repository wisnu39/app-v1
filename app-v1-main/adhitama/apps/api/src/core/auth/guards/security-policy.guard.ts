import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.type';

@Injectable()
export class SecurityPolicyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: AuthUser;
      }
    >();

    const user = request.user;
    const route = request.route as { path?: string } | undefined;
    if (!user) {
      throw new ForbiddenException();
    }

    if (route?.path === '/auth/me') {
      return true;
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException('Password change required');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Email verification required');
    }

    return true;
  }
}
