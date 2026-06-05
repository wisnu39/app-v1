import type { NotificationTemplateName } from '../constants/notification.constants';

export interface EmailNotificationInput {
  to: string;
  subject: string;
  template: NotificationTemplateName;
  templateVariables: Record<string, string>;
  replyTo?: string;
  tenantId: string;
}

export interface RenderedNotificationEmail {
  subject: string;
  html: string;
  text: string;
}
