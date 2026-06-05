import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { AuthRepository } from '../repositories/auth.repository';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { NotificationService } from '@modules/notification/services/notification.service';
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { AuditService } from '@modules/audit/services/audit.service';
import { AUDIT_EVENT } from '@modules/audit/constants/audit-event.constants';
import { hashEmailVerificationToken } from '../helpers/email-verification-token.helper';
import type { EmailVerificationTokenRecord } from '../types/email-verification.types';
import { buildEmailVerificationModule } from '../../../test-utils/auth-test-utils';
import { buildUserForAuth, buildEmailVerificationTokenRecord, TENANT_ID_1 } from '../../../test-utils/fixtures/auth-fixtures';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let authRepository: jest.Mocked<AuthRepository>;
  let emailVerificationRepository: jest.Mocked<EmailVerificationRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let auditService: jest.Mocked<AuditService>;

  const tenantId = TENANT_ID_1;
  const userId = 'user-1';
  const email = 'user@example.com';

  beforeEach(async () => {
    const { service: svc, mocks } = await buildEmailVerificationModule();

    service = svc;
    authRepository = mocks.authRepository;
    emailVerificationRepository = mocks.emailVerificationRepository;
    notificationService = mocks.notificationService;
    auditService = mocks.auditService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const tokenRecord = (overrides?: Partial<EmailVerificationTokenRecord>): EmailVerificationTokenRecord =>
    buildEmailVerificationTokenRecord({
      tenantId,
      userId,
      tokenHash: 'hash',
      ...overrides,
    });

  it('should verify a valid token successfully and audit success', async () => {
    emailVerificationRepository.findTokenByHash.mockResolvedValue(tokenRecord());
    emailVerificationRepository.markTokenUsedAndVerifyUser.mockResolvedValue(true);

    await expect(service.verifyEmail('a'.repeat(96), tenantId)).resolves.toBeUndefined();

    expect(
      emailVerificationRepository.markTokenUsedAndVerifyUser.mock.calls.length,
    ).toBe(1);
    expect(
      emailVerificationRepository.markTokenUsedAndVerifyUser.mock.calls[0],
    ).toEqual(['token-1', userId, tenantId]);
    expect(auditService.fireAndForget).toHaveBeenCalled();
    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.VERIFICATION_SUCCESS,
        entityId: userId,
      }),
    );
  });

  it('should reject an expired token and audit expiration', async () => {
    emailVerificationRepository.findTokenByHash.mockResolvedValue(
      tokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.verifyEmail('a'.repeat(96), tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.VERIFICATION_TOKEN_EXPIRED,
      }),
    );
  });

  it('should reject a reused token and audit replay failure', async () => {
    emailVerificationRepository.findTokenByHash.mockResolvedValue(
      tokenRecord({ usedAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.verifyEmail('a'.repeat(96), tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.VERIFICATION_FAILED,
        metadata: expect.objectContaining({ reason: 'token_already_used' }),
      }),
    );
  });

  it('should reject an invalid token and audit invalid attempts', async () => {
    emailVerificationRepository.findTokenByHash.mockResolvedValue(null);

    await expect(service.verifyEmail('a'.repeat(96), tenantId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(auditService.fireAndForget).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENT.VERIFICATION_FAILED,
        metadata: expect.objectContaining({ reason: 'invalid_token' }),
      }),
    );
  });

  it('should reject cross-tenant resend by returning not found', async () => {
    authRepository.findByEmail.mockResolvedValue(null);

    await expect(service.resendVerification(email, 'other-tenant')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should reject cross-tenant verification by tenant-scoped token lookup', async () => {
    const rawToken = 'a'.repeat(96);
    const tokenHash = hashEmailVerificationToken(rawToken);
    emailVerificationRepository.findTokenByHash.mockResolvedValue(null);

    await expect(service.verifyEmail(rawToken, 'other-tenant')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(emailVerificationRepository.findTokenByHash.mock.calls[0]).toEqual([
      tokenHash,
      'other-tenant',
    ]);
  });

  it('should throttle resend requests within cooldown window', async () => {
    authRepository.findByEmail.mockResolvedValue(
      buildUserForAuth({
        id: userId,
        tenantId,
        email,
        passwordHash: 'hash',
        emailVerifiedAt: null,
      }),
    );
    emailVerificationRepository.findLatestTokenByUserId.mockResolvedValue(
      tokenRecord({ createdAt: new Date(Date.now() - 1000 * 60 * 1) }),
    );

    await expect(service.resendVerification(email, tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should invalidate previous tokens when resending verification', async () => {
    authRepository.findByEmail.mockResolvedValue(
      buildUserForAuth({
        id: userId,
        tenantId,
        email,
        passwordHash: 'hash',
        emailVerifiedAt: null,
      }),
    );
    emailVerificationRepository.findLatestTokenByUserId.mockResolvedValue(
      tokenRecord({ createdAt: new Date(Date.now() - 1000 * 60 * 10) }),
    );
    notificationService.sendEmail.mockResolvedValue();

    await expect(service.resendVerification(email, tenantId)).resolves.toBeUndefined();

    expect(emailVerificationRepository.invalidateUnusedTokensForUser.mock.calls.length).toBe(1);
    expect(emailVerificationRepository.invalidateUnusedTokensForUser.mock.calls[0]).toEqual([
      userId,
      tenantId,
    ]);
    expect(emailVerificationRepository.createToken.mock.calls.length).toBe(1);

    expect(auditService.fireAndForget.mock.calls.length).toBeGreaterThan(0);
    expect(auditService.fireAndForget.mock.calls[auditService.fireAndForget.mock.calls.length - 1][0]).toEqual(
      expect.objectContaining({
        action: AUDIT_EVENT.VERIFICATION_EMAIL_RESENT,
        entityId: userId,
      }),
    );
  });

  it('should treat concurrent verify requests as replay and reject the second attempt', async () => {
    emailVerificationRepository.findTokenByHash.mockResolvedValue(tokenRecord());
    emailVerificationRepository.markTokenUsedAndVerifyUser.mockResolvedValue(false);

    await expect(service.verifyEmail('a'.repeat(96), tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(auditService.fireAndForget.mock.calls.length).toBeGreaterThan(0);
    const auditEvent = auditService.fireAndForget.mock.calls[0][0];
    expect(auditEvent).toMatchObject({
      action: AUDIT_EVENT.VERIFICATION_FAILED,
    });
    expect((auditEvent.metadata as Record<string, unknown>).reason).toBe('token_already_used_or_user_missing');
  });

  it('should continue resend flow despite notification failure and audit the failure', async () => {
    authRepository.findByEmail.mockResolvedValue(
      buildUserForAuth({
        id: userId,
        tenantId,
        email,
        passwordHash: 'hash',
        emailVerifiedAt: null,
      }),
    );
    emailVerificationRepository.findLatestTokenByUserId.mockResolvedValue(null);
    notificationService.sendEmail.mockRejectedValue(new Error('SMTP down'));

    await expect(service.resendVerification(email, tenantId)).resolves.toBeUndefined();

    expect(auditService.fireAndForget.mock.calls.length).toBeGreaterThan(0);
    expect(auditService.fireAndForget.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        action: AUDIT_EVENT.VERIFICATION_EMAIL_FAILED,
      }),
    );
  });
});
