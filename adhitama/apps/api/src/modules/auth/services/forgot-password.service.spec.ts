/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { AuthRepository } from '../repositories/auth.repository';
import { ForgotPasswordRepository } from '../repositories/forgot-password.repository';
import { NotificationService } from '@modules/notification/services/notification.service';
import { AuditService } from '@modules/audit/services/audit.service';
import { PasswordService } from '@infrastructure/password';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { AUDIT_EVENT } from '@modules/audit/constants/audit-event.constants';
import type { PasswordResetTokenRecord } from '../types/password-reset.types';
import { buildForgotPasswordModule } from '../../../test-utils/auth-test-utils';

describe('ForgotPasswordService', () => {
  let service: ForgotPasswordService;
  let authRepository: jest.Mocked<AuthRepository>;
  let forgotPasswordRepository: jest.Mocked<ForgotPasswordRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let auditService: jest.Mocked<AuditService>;
  let passwordService: jest.Mocked<PasswordService>;
  let sessionService: jest.Mocked<SessionService>;

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const email = 'user@example.com';

  beforeEach(async () => {
    const { service: svc, mocks } = await buildForgotPasswordModule();

    service = svc;
    authRepository = mocks.authRepository;
    forgotPasswordRepository = mocks.forgotPasswordRepository;
    notificationService = mocks.notificationService;
    auditService = mocks.auditService;
    passwordService = mocks.passwordService;
    sessionService = mocks.sessionService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const tokenRecord = (
    overrides?: Partial<PasswordResetTokenRecord>,
  ): PasswordResetTokenRecord => ({
    id: 'token-1',
    tenantId,
    userId,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    usedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    ...overrides,
  });

  it('should issue a password reset email when the user exists', async () => {
    authRepository.findByEmail.mockResolvedValue({
      id: userId,
      tenantId,
      roleId: 'role-1',
      email,
      nip: null,
      passwordHash: 'hash',
      status: 'ACTIVE',
      deletedAt: null,
      mustChangePassword: false,
      emailVerifiedAt: null,
    });
    forgotPasswordRepository.findLatestTokenByUserId.mockResolvedValue(null);
    notificationService.sendEmail.mockResolvedValue();

    await expect(service.requestPasswordReset(email, tenantId)).resolves.toBeUndefined();

    expect(forgotPasswordRepository.invalidateUnusedTokensForUser.mock.calls[0]).toEqual([
      userId,
      tenantId,
    ]);
    expect(forgotPasswordRepository.createToken.mock.calls.length).toBeGreaterThan(0);
    expect(notificationService.sendEmail.mock.calls[0][0]).toMatchObject({
      to: email,
      tenantId,
    });

    expect(auditService.fireAndForget).toHaveBeenCalled();
    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.PASSWORD_RESET_EMAIL_SENT,
        entityId: userId,
      }),
    );
  });

  it('should not fail when requesting password reset for unknown user', async () => {
    authRepository.findByEmail.mockResolvedValue(null);

    await expect(service.requestPasswordReset(email, tenantId)).resolves.toBeUndefined();

    expect(forgotPasswordRepository.createToken.mock.calls.length).toBe(0);
    expect(notificationService.sendEmail.mock.calls.length).toBe(0);
    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.PASSWORD_RESET_REQUESTED,
      }),
    );
  });

  it('should ignore repeated password reset requests during cooldown', async () => {
    authRepository.findByEmail.mockResolvedValue({
      id: userId,
      tenantId,
      roleId: 'role-1',
      email,
      nip: null,
      passwordHash: 'hash',
      status: 'ACTIVE',
      deletedAt: null,
      mustChangePassword: false,
      emailVerifiedAt: null,
    });
    forgotPasswordRepository.findLatestTokenByUserId.mockResolvedValue(
      tokenRecord({ createdAt: new Date(Date.now() - 1000 * 60 * 1) }),
    );

    await expect(service.requestPasswordReset(email, tenantId)).resolves.toBeUndefined();

    expect(forgotPasswordRepository.createToken.mock.calls.length).toBe(0);
    expect(notificationService.sendEmail.mock.calls.length).toBe(0);
    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.PASSWORD_RESET_REQUEST_IGNORED,
      }),
    );
  });

  it('should reject reset with invalid token format and audit failure', async () => {
    await expect(service.resetPassword('invalid-token', 'NewPassword123', tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(auditService.fireAndForget.mock.calls[0][0]).toMatchObject({
      action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
    });
  });

  it('should reject reset with unknown token hash and audit failure', async () => {
    forgotPasswordRepository.findTokenByHash.mockResolvedValue(null);

    await expect(service.resetPassword('a'.repeat(96), 'NewPassword123', tenantId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(auditService.fireAndForget.mock.calls[0][0]).toMatchObject({
      action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
    });
  });

  it('should reject expired reset token and audit expiration', async () => {
    forgotPasswordRepository.findTokenByHash.mockResolvedValue(
      tokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.resetPassword('a'.repeat(96), 'NewPassword123', tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(auditService.fireAndForget.mock.calls[0][0]).toMatchObject({
      action: AUDIT_EVENT.PASSWORD_RESET_TOKEN_EXPIRED,
    });
  });

  it('should reset password successfully and revoke all sessions', async () => {
    forgotPasswordRepository.findTokenByHash.mockResolvedValue(tokenRecord());
    passwordService.hash.mockResolvedValue('new-password-hash');
    forgotPasswordRepository.markTokenUsedAndResetPassword.mockResolvedValue(true);
    sessionService.revokeAllSessions.mockResolvedValue(1);

    await expect(service.resetPassword('a'.repeat(96), 'NewPassword123', tenantId)).resolves.toBeUndefined();

    expect(passwordService.hash.mock.calls[0]).toEqual(['NewPassword123']);
    expect(forgotPasswordRepository.markTokenUsedAndResetPassword.mock.calls[0]).toEqual([
      'token-1',
      userId,
      tenantId,
      'new-password-hash',
    ]);
    expect(sessionService.revokeAllSessions.mock.calls[0]).toEqual([userId, tenantId]);
    expect(auditService.fireAndForget.mock.calls[0][0]).toMatchObject({
      action: AUDIT_EVENT.PASSWORD_RESET_SUCCESS,
    });
  });
});
