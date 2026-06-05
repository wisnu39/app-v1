import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUDIT_EVENT } from '@modules/audit/constants/audit-event.constants';
import { AuditService } from '@modules/audit/services/audit.service';
import { AuthRepository } from '../repositories/auth.repository';
import { ForgotPasswordRepository } from '../repositories/forgot-password.repository';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NOTIFICATION_TEMPLATE_NAME } from '@modules/notification/constants/notification.constants';
import { PasswordService } from '@infrastructure/password';
import { SessionService } from './session.service';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isLikelyPasswordResetToken,
} from '../helpers/password-reset-token.helper';
import type { MailConfig } from '@config/mail.config';

export interface PasswordResetAuditContext {
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger(ForgotPasswordService.name);
  private readonly resetUrlTemplate: string | null;
  private readonly resetTokenExpiryMs = 1000 * 60 * 60; // 1 hour
  private readonly requestCooldownMs = 1000 * 60 * 2; // 2 minutes

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly forgotPasswordRepository: ForgotPasswordRepository,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {
    const mailConfig = this.configService.get<MailConfig>('mail');
    this.resetUrlTemplate = mailConfig?.passwordResetUrl ?? null;
  }

  async requestPasswordReset(
    email: string,
    tenantId: string,
    auditContext?: PasswordResetAuditContext,
  ): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findByEmail(normalizedEmail, tenantId);

    if (!user) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_REQUESTED,
        entityType: 'User',
        entityId: 'unknown',
        metadata: {
          email: normalizedEmail,
          reason: 'user_not_found',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      return;
    }

    const latestToken = await this.forgotPasswordRepository.findLatestTokenByUserId(
      user.id,
      tenantId,
    );

    if (
      latestToken &&
      Date.now() - latestToken.createdAt.getTime() < this.requestCooldownMs
    ) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_REQUEST_IGNORED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          reason: 'cooldown',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      return;
    }

    await this.forgotPasswordRepository.invalidateUnusedTokensForUser(
      user.id,
      tenantId,
    );

    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + this.resetTokenExpiryMs);

    await this.forgotPasswordRepository.createToken({
      userId: user.id,
      tenantId,
      tokenHash,
      expiresAt,
    });

    const resetUrl = this.buildResetUrl(rawToken);

    try {
      await this.notificationService.sendEmail({
        to: user.email,
        subject: 'Reset your password',
        template: NOTIFICATION_TEMPLATE_NAME.PASSWORD_RESET,
        templateVariables: {
          resetUrl:
            resetUrl ??
            'Use the password reset link from your email provider.',
        },
        tenantId,
      });

      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_EMAIL_SENT,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          expiresAt: expiresAt.toISOString(),
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Password reset email failed to=${user.email} tenant=${tenantId}: ${message}`,
      );

      await this.auditService.log({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_EMAIL_FAILED,
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          reason: message,
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
    }
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
    tenantId: string,
    auditContext?: PasswordResetAuditContext,
  ): Promise<void> {
    if (!isLikelyPasswordResetToken(rawToken)) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
        entityType: 'PasswordResetToken',
        entityId: 'unknown',
        metadata: {
          reason: 'invalid_token_format',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      throw new BadRequestException('Password reset token format is invalid');
    }

    const tokenHash = hashPasswordResetToken(rawToken);
    const token = await this.forgotPasswordRepository.findTokenByHash(
      tokenHash,
      tenantId,
    );

    if (!token) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
        entityType: 'PasswordResetToken',
        entityId: 'unknown',
        metadata: {
          reason: 'invalid_token',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      throw new NotFoundException(
        'Password reset token is invalid or has already been used',
      );
    }

    if (token.usedAt !== null) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
        entityType: 'PasswordResetToken',
        entityId: token.id,
        metadata: {
          reason: 'token_already_used',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      throw new BadRequestException('Password reset token has already been used');
    }

    if (token.expiresAt <= new Date()) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_TOKEN_EXPIRED,
        entityType: 'PasswordResetToken',
        entityId: token.id,
        metadata: {
          expiresAt: token.expiresAt.toISOString(),
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      throw new BadRequestException('Password reset token has expired');
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    const completed = await this.forgotPasswordRepository.markTokenUsedAndResetPassword(
      token.id,
      token.userId,
      tenantId,
      passwordHash,
    );

    if (!completed) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.PASSWORD_RESET_FAILED,
        entityType: 'PasswordResetToken',
        entityId: token.id,
        metadata: {
          reason: 'token_already_used_or_user_missing',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });

      throw new BadRequestException('Password reset token is no longer valid');
    }

    try {
      await this.sessionService.revokeAllSessions(token.userId, tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Password reset completed but session revocation failed userId=${token.userId} tenant=${tenantId}: ${message}`,
      );
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: auditContext?.actorUserId ?? null,
      action: AUDIT_EVENT.PASSWORD_RESET_SUCCESS,
      entityType: 'User',
      entityId: token.userId,
      metadata: {
        tokenId: token.id,
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
      sessionId: auditContext?.sessionId ?? null,
    });
  }

  private buildResetUrl(rawToken: string): string | null {
    if (!this.resetUrlTemplate) {
      return null;
    }

    if (this.resetUrlTemplate.includes('{{token}}')) {
      return this.resetUrlTemplate.replace(
        '{{token}}',
        encodeURIComponent(rawToken),
      );
    }

    return `${this.resetUrlTemplate}${this.resetUrlTemplate.includes('?') ? '&' : '?'}token=${encodeURIComponent(
      rawToken,
    )}`;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
