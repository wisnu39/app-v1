/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';
import { ForgotPasswordRepository } from '../repositories/forgot-password.repository';
import { ForgotPasswordService } from '../services/forgot-password.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { AuditService } from '@modules/audit/services/audit.service';
import { PasswordService } from '@infrastructure/password';
import { SessionService } from '../services/session.service';
import { AUDIT_EVENT } from '@modules/audit/constants/audit-event.constants';
import {
  buildUserForAuth,
  buildPasswordResetTokenRecord,
  TENANT_ID_1,
  TENANT_ID_2,
} from '../../../test-utils/fixtures/auth-fixtures';
import { buildRequestContext } from '../../../test-utils/request-context';
import {
  hashPasswordResetToken,
  generatePasswordResetToken,
  isLikelyPasswordResetToken,
} from '../helpers/password-reset-token.helper';
import { buildForgotPasswordModule } from '../../../test-utils/auth-test-utils';

/**
 * Integration Test Suite for Forgot Password Flow
 *
 * Coverage:
 *   - Valid reset request + resend
 *   - Invalid token format
 *   - Expired token
 *   - Reused token (replay protection)
 *   - Cross-tenant attempt
 *   - Concurrent reset attempts
 *   - Session revoked after success
 *   - Notification failure handling
 *   - Throttle/rate limit behavior (cooldown)
 *   - User not found (security)
 *   - Transaction atomicity
 */
describe('ForgotPasswordService Integration Tests', () => {
  let service: ForgotPasswordService;
  let authRepository: jest.Mocked<AuthRepository>;
  let forgotPasswordRepository: jest.Mocked<ForgotPasswordRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let auditService: jest.Mocked<AuditService>;
  let passwordService: jest.Mocked<PasswordService>;
  let sessionService: jest.Mocked<SessionService>;

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

  describe('requestPasswordReset', () => {
    it('should send password reset email for valid user', async () => {
      const email = 'user@example.com';
      const mockUser = buildUserForAuth({ email, tenantId: TENANT_ID_1 });

      authRepository.findByEmail.mockResolvedValue(mockUser);
      forgotPasswordRepository.findLatestTokenByUserId.mockResolvedValue(null);
      forgotPasswordRepository.invalidateUnusedTokensForUser.mockResolvedValue(0);
      forgotPasswordRepository.createToken.mockResolvedValue(
        buildPasswordResetTokenRecord({
          id: 'token-1',
          tenantId: TENANT_ID_1,
          userId: 'user-1',
          tokenHash: 'hash-value',
        }),
      );
      notificationService.sendEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset(email, TENANT_ID_1, buildRequestContext({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }));

       
      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          template: 'PASSWORD_RESET',
        }),
      );
       
       
       
       
       
       
       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_EMAIL_SENT,
        }),
      );
    });

    it('should not fail for unknown user (constant-time response)', async () => {
      const email = 'unknown@example.com';

      authRepository.findByEmail.mockResolvedValue(null);

      await service.requestPasswordReset(email, TENANT_ID_1, {
        ipAddress: '192.168.1.1',
      });

       
      expect(notificationService.sendEmail).not.toHaveBeenCalled();
       
       
       
       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_REQUESTED,
          metadata: expect.objectContaining({ reason: 'user_not_found' }),
        }),
      );
    });

    it('should respect cooldown period (throttle)', async () => {
      const email = 'user@example.com';
      const mockUser = buildUserForAuth({ email, tenantId: TENANT_ID_1 });
      const recentToken = buildPasswordResetTokenRecord({
        id: 'token-1',
        userId: 'user-1',
        tenantId: TENANT_ID_1,
        createdAt: new Date(Date.now() - 30000), // 30 seconds ago
      });

      authRepository.findByEmail.mockResolvedValue(mockUser);
      forgotPasswordRepository.findLatestTokenByUserId.mockResolvedValue(recentToken);

      await service.requestPasswordReset(email, TENANT_ID_1, buildRequestContext());

       
      expect(notificationService.sendEmail).not.toHaveBeenCalled();
       
       
       
       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_REQUEST_IGNORED,
          metadata: expect.objectContaining({ reason: 'cooldown' }),
        }),
      );
    });

    it('should invalidate previous unused tokens on new request', async () => {
      const email = 'user@example.com';
      const mockUser = buildUserForAuth({ email, tenantId: TENANT_ID_1 });

      authRepository.findByEmail.mockResolvedValue(mockUser);
      forgotPasswordRepository.findLatestTokenByUserId.mockResolvedValue(null);
      forgotPasswordRepository.invalidateUnusedTokensForUser.mockResolvedValue(1);
      forgotPasswordRepository.createToken.mockResolvedValue(
        buildPasswordResetTokenRecord({
          id: 'token-2',
          tokenHash: 'new-hash',
          tenantId: TENANT_ID_1,
          userId: 'user-1',
        }),
      );
      notificationService.sendEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset(email, TENANT_ID_1);

       
      expect(forgotPasswordRepository.invalidateUnusedTokensForUser).toHaveBeenCalledWith(
        'user-1',
        TENANT_ID_1,
      );
    });

    it('should handle notification failure but keep token created', async () => {
      const email = 'user@example.com';
      const mockUser = buildUserForAuth({ email, tenantId: TENANT_ID_1 });

      authRepository.findByEmail.mockResolvedValue(mockUser);
      forgotPasswordRepository.findLatestTokenByUserId.mockResolvedValue(null);
      forgotPasswordRepository.invalidateUnusedTokensForUser.mockResolvedValue(0);
      forgotPasswordRepository.createToken.mockResolvedValue(
        buildPasswordResetTokenRecord({
          id: 'token-1',
          tenantId: TENANT_ID_1,
          userId: 'user-1',
          tokenHash: 'hash-value',
        }),
      );
      notificationService.sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

      await service.requestPasswordReset(email, TENANT_ID_1);

       
      expect(forgotPasswordRepository.createToken).toHaveBeenCalled();
       
       
       
       
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_EMAIL_FAILED,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully for valid token', async () => {
      const rawToken = generatePasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);
      const newPassword = 'newPassword@123';
      const mockToken = buildPasswordResetTokenRecord({
        tokenHash,
        userId: 'user-1',
        tenantId: TENANT_ID_1,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      });


      forgotPasswordRepository.findTokenByHash.mockResolvedValue(mockToken);
      passwordService.hash.mockResolvedValue('hashed-password');
      forgotPasswordRepository.markTokenUsedAndResetPassword.mockResolvedValue(true);
      sessionService.revokeAllSessions.mockResolvedValue(1);

      await service.resetPassword(rawToken, newPassword, TENANT_ID_1, {
        ipAddress: '192.168.1.1',
      });

         
        expect(passwordService.hash).toHaveBeenCalledWith(newPassword);
         
        expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('user-1', TENANT_ID_1);
       
       
       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_SUCCESS,
        }),
      );
    });

    it('should reject invalid token format', async () => {
      const invalidToken = 'invalid-format';

      expect(isLikelyPasswordResetToken(invalidToken)).toBe(false);

      await expect(
        service.resetPassword(invalidToken, 'newPassword@123', TENANT_ID_1),
      ).rejects.toThrow(BadRequestException);

       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
          metadata: expect.objectContaining({ reason: 'invalid_token_format' }),
        }),
      );
    });

    it('should reject unknown/invalid token', async () => {
      const rawToken = generatePasswordResetToken();

      forgotPasswordRepository.findTokenByHash.mockResolvedValue(null);

      await expect(
        service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_1),
      ).rejects.toThrow(NotFoundException);

       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
          metadata: expect.objectContaining({ reason: 'invalid_token' }),
        }),
      );
    });

    it('should reject expired token', async () => {
      const rawToken = generatePasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);
      const mockToken = buildPasswordResetTokenRecord({
        tokenHash,
        userId: 'user-1',
        tenantId: TENANT_ID_1,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });

      forgotPasswordRepository.findTokenByHash.mockResolvedValue(mockToken);

      await expect(
        service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_1),
      ).rejects.toThrow(BadRequestException);

       
       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_TOKEN_EXPIRED,
        }),
      );
    });

    it('should reject reused token (replay protection)', async () => {
      const rawToken = generatePasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);
      const mockToken = buildPasswordResetTokenRecord({
        tokenHash,
        userId: 'user-1',
        tenantId: TENANT_ID_1,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 100000),
      });

      forgotPasswordRepository.findTokenByHash.mockResolvedValue(mockToken);

      await expect(
        service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_1),
      ).rejects.toThrow(BadRequestException);

       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
          metadata: expect.objectContaining({ reason: 'token_already_used' }),
        }),
      );
    });

    it('should enforce tenant isolation (cross-tenant attempt)', async () => {
      const rawToken = generatePasswordResetToken();

      // Token not found in TENANT_ID_2 (it belongs to TENANT_ID_1)
      forgotPasswordRepository.findTokenByHash.mockResolvedValue(null);

      await expect(
        service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_2),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle concurrent reset attempts (transaction safety)', async () => {
      const rawToken = generatePasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);

      forgotPasswordRepository.findTokenByHash.mockResolvedValue(
        buildPasswordResetTokenRecord({
          tokenHash,
          userId: 'user-1',
          tenantId: TENANT_ID_1,
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: null,
        }),
      );

      passwordService.hash.mockResolvedValue('hashed-password');
      // First attempt succeeds
      forgotPasswordRepository.markTokenUsedAndResetPassword.mockResolvedValueOnce(true);

      // Second attempt fails (token already used)
      forgotPasswordRepository.markTokenUsedAndResetPassword.mockResolvedValueOnce(false);

      // First call succeeds
      sessionService.revokeAllSessions.mockResolvedValue(1);
      await service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_1);

      // Second call fails
      forgotPasswordRepository.findTokenByHash.mockResolvedValue(
        buildPasswordResetTokenRecord({
          tokenHash,
          userId: 'user-1',
          tenantId: TENANT_ID_1,
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: new Date(),
        }),
      );

      await expect(
        service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle session revocation failure gracefully', async () => {
      const rawToken = generatePasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);

      forgotPasswordRepository.findTokenByHash.mockResolvedValue(
        buildPasswordResetTokenRecord({
          tokenHash,
          userId: 'user-1',
          tenantId: TENANT_ID_1,
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: null,
        }),
      );

      passwordService.hash.mockResolvedValue('hashed-password');
      forgotPasswordRepository.markTokenUsedAndResetPassword.mockResolvedValue(true);
      sessionService.revokeAllSessions.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw even though session revocation failed
      await service.resetPassword(rawToken, 'newPassword@123', TENANT_ID_1);

       
      expect(auditService.fireAndForget).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_EVENT.PASSWORD_RESET_SUCCESS,
        }),
      );
    });
  });
});
