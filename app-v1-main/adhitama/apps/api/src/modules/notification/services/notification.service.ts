import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@modules/audit/services/audit.service';
import { MailService } from '@infrastructure/mail';
import { NotificationTemplateRenderer } from '../helpers/notification-template-renderer.helper';
import type { EmailNotificationInput, RenderedNotificationEmail } from '../types/notification.types';
import { AUDIT_EVENT } from '@modules/audit/constants/audit-event.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly templateRenderer: NotificationTemplateRenderer,
    private readonly auditService: AuditService,
  ) {}

  async sendEmail(input: EmailNotificationInput): Promise<void> {
    const content = this.buildEmailContent(input);

    try {
      await this.mailService.sendMail({
        to: input.to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: input.replyTo,
      });

      this.auditService.fireAndForget({
        tenantId: input.tenantId,
        actorUserId: null,
        action: AUDIT_EVENT.NOTIFICATION_SENT,
        entityType: 'NOTIFICATION',
        entityId: input.to,
        metadata: {
          template: input.template,
          subject: content.subject,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `sendEmail() failed to=${input.to} template=${input.template}: ${message}`,
      );
      throw error;
    }
  }

  fireAndForgetEmail(input: EmailNotificationInput): void {
    void this.sendEmail(input);
  }

  private buildEmailContent(input: EmailNotificationInput): RenderedNotificationEmail {
    return this.templateRenderer.renderTemplate(input.template, input.templateVariables);
  }
}
