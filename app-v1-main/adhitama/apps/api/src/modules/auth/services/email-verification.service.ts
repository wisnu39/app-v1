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
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NOTIFICATION_TEMPLATE_NAME } from '@modules/notification/constants/notification.constants';
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  isLikelyEmailVerificationToken,
} from '../helpers/email-verification-token.helper';
import type { MailConfig } from '@config/mail.config';

export interface VerificationAuditContext {
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly verificationUrlTemplate: string | null;
  private readonly verificationTokenExpiryMs = 1000 * 60 * 60; // 1 hour
  private readonly resendCooldownMs = 1000 * 60 * 2; // 2 minutes

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    const mailConfig = this.configService.get<MailConfig>('mail');
    this.verificationUrlTemplate = mailConfig?.emailVerificationUrl ?? null;
  }

  async issueAndSendVerification(
    userId: string,
    tenantId: string,
    email: string,
    auditContext?: VerificationAuditContext,
  ): Promise<void> {
    await this.emailVerificationRepository.invalidateUnusedTokensForUser(
      userId,
      tenantId,
    );

    const rawToken = generateEmailVerificationToken();
    const tokenHash = hashEmailVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + this.verificationTokenExpiryMs);

    await this.emailVerificationRepository.createToken({
      userId,
      tenantId,
      tokenHash,
      expiresAt,
    });

    const verificationUrl = this.buildVerificationUrl(rawToken);

    try {
      await this.notificationService.sendEmail({
        to: email,
        subject: 'Verify your email address',
        template: NOTIFICATION_TEMPLATE_NAME.EMAIL_VERIFICATION,
        templateVariables: {
          verificationUrl: verificationUrl ?? 'Use the code below to verify your email.',
          verificationCode: rawToken,
        },
        tenantId,
      });

      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_EMAIL_SENT,
        entityType: 'User',
        entityId: userId,
        metadata: {
          email,
          expiresAt: expiresAt.toISOString(),
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Verification email send failed to=${email} tenant=${tenantId}: ${message}`,
      );

      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_EMAIL_FAILED,
        entityType: 'User',
        entityId: userId,
        metadata: {
          email,
          reason: message,
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
    }
  }

  async resendVerification(
    email: string,
    tenantId: string,
    auditContext?: VerificationAuditContext,
  ): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findByEmail(normalizedEmail, tenantId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerifiedAt !== null) {
      throw new BadRequestException('Email already verified');
    }

    const latestToken = await this.emailVerificationRepository.findLatestTokenByUserId(
      user.id,
      tenantId,
    );

    if (
      latestToken &&
      Date.now() - latestToken.createdAt.getTime() < this.resendCooldownMs
    ) {
      throw new BadRequestException(
        'Please wait before requesting another verification email',
      );
    }

    await this.emailVerificationRepository.removeExpiredTokens(tenantId);
    await this.issueAndSendVerification(user.id, tenantId, user.email, auditContext);

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: auditContext?.actorUserId ?? null,
      action: AUDIT_EVENT.VERIFICATION_EMAIL_RESENT,
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
      sessionId: auditContext?.sessionId ?? null,
    });
  }

  async verifyEmail(
    rawToken: string,
    tenantId: string,
    auditContext?: VerificationAuditContext,
  ): Promise<void> {
    if (!isLikelyEmailVerificationToken(rawToken)) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_FAILED,
        entityType: 'EmailVerificationToken',
        entityId: 'unknown',
        metadata: {
          reason: 'invalid_token_format',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
      throw new BadRequestException('Verification token format is invalid');
    }

    const tokenHash = hashEmailVerificationToken(rawToken);
    const token = await this.emailVerificationRepository.findTokenByHash(
      tokenHash,
      tenantId,
    );

    if (!token) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_FAILED,
        entityType: 'EmailVerificationToken',
        entityId: 'unknown',
        metadata: {
          reason: 'invalid_token',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
      throw new NotFoundException('Verification token is invalid or has already been used');
    }

    if (token.usedAt !== null) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_FAILED,
        entityType: 'EmailVerificationToken',
        entityId: token.id,
        metadata: {
          reason: 'token_already_used',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
      throw new BadRequestException('Verification token has already been used');
    }

    if (token.expiresAt <= new Date()) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_TOKEN_EXPIRED,
        entityType: 'EmailVerificationToken',
        entityId: token.id,
        metadata: {
          expiresAt: token.expiresAt.toISOString(),
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
      throw new BadRequestException('Verification token has expired');
    }

    const completed = await this.emailVerificationRepository.markTokenUsedAndVerifyUser(
      token.id,
      token.userId,
      tenantId,
    );

    if (!completed) {
      this.auditService.fireAndForget({
        tenantId,
        actorUserId: auditContext?.actorUserId ?? null,
        action: AUDIT_EVENT.VERIFICATION_FAILED,
        entityType: 'EmailVerificationToken',
        entityId: token.id,
        metadata: {
          reason: 'token_already_used_or_user_missing',
        },
        ipAddress: auditContext?.ipAddress ?? null,
        userAgent: auditContext?.userAgent ?? null,
        sessionId: auditContext?.sessionId ?? null,
      });
      throw new BadRequestException('Verification token is no longer valid');
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: auditContext?.actorUserId ?? null,
      action: AUDIT_EVENT.VERIFICATION_SUCCESS,
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

  private buildVerificationUrl(rawToken: string): string | null {
    if (!this.verificationUrlTemplate) {
      return null;
    }

    if (this.verificationUrlTemplate.includes('{{token}}')) {
      return this.verificationUrlTemplate.replace(
        '{{token}}',
        encodeURIComponent(rawToken),
      );
    }

    return `${this.verificationUrlTemplate}${this.verificationUrlTemplate.includes('?') ? '&' : '?'}token=${encodeURIComponent(
      rawToken,
    )}`;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
