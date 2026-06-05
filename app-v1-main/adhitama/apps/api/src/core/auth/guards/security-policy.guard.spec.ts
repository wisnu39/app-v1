/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type';
import { SecurityPolicyGuard } from './security-policy.guard';

const baseUser: AuthUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  sessionId: 'session-1',
  roleId: 'role-1',
  mustChangePassword: false,
  emailVerified: true,
};

function createExecutionContext(user: Partial<AuthUser> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { ...baseUser, ...user },
      }),
    }),
  } as ExecutionContext;
}

describe('SecurityPolicyGuard', () => {
  let guard: SecurityPolicyGuard;

  beforeEach(() => {
    guard = new SecurityPolicyGuard();
  });

  it('allows verified users who have completed password change', () => {
    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('blocks users who still need to change their password', () => {
    expect(() =>
      guard.canActivate(createExecutionContext({ mustChangePassword: true })),
    ).toThrow(ForbiddenException);
  });

  it('blocks users whose email is not verified', () => {
    expect(() =>
      guard.canActivate(createExecutionContext({ emailVerified: false })),
    ).toThrow(ForbiddenException);
  });

  it('does not throw for routes that are intentionally exempted', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { ...baseUser, mustChangePassword: true },
          route: { path: '/auth/me' },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
