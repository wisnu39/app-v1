import { UserForAuth } from '@modules/auth/types/auth-repository.types';
import { PasswordResetTokenRecord } from '@modules/auth/types/password-reset.types';
import { EmailVerificationTokenRecord } from '@modules/auth/types/email-verification.types';

export const TENANT_ID_1 = 'tenant-1';
export const TENANT_ID_2 = 'tenant-2';

export function buildUserForAuth(overrides?: Partial<UserForAuth>): UserForAuth {
  return {
    id: 'user-1',
    tenantId: TENANT_ID_1,
    roleId: 'role-user',
    email: 'user@example.com',
    nip: null,
    passwordHash: 'password-hash',
    status: 'active',
    deletedAt: null,
    mustChangePassword: false,
    emailVerifiedAt: null,
    ...overrides,
  };
}

export function buildPasswordResetTokenRecord(
  overrides?: Partial<PasswordResetTokenRecord>,
): PasswordResetTokenRecord {
  return {
    id: 'token-1',
    tenantId: TENANT_ID_1,
    userId: 'user-1',
    tokenHash: 'token-hash',
    expiresAt: new Date(Date.now() + 3600_000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function buildEmailVerificationTokenRecord(
  overrides?: Partial<EmailVerificationTokenRecord>,
): EmailVerificationTokenRecord {
  return {
    id: 'token-1',
    tenantId: TENANT_ID_1,
    userId: 'user-1',
    tokenHash: 'token-hash',
    expiresAt: new Date(Date.now() + 3600_000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}
