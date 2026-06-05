import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationTemplateName } from '../constants/notification.constants';
import type { RenderedNotificationEmail } from '../types/notification.types';
import { NOTIFICATION_TEMPLATES } from '../templates/notification.templates';

@Injectable()
export class NotificationTemplateRenderer {
  renderTemplate(
    templateName: NotificationTemplateName,
    variables: Record<string, string>,
  ): RenderedNotificationEmail {
    const template = NOTIFICATION_TEMPLATES[templateName];

    if (!template) {
      throw new NotFoundException(`Unknown notification template: ${templateName}`);
    }

    return {
      subject: template.subject,
      html: this.interpolate(template.html, variables),
      text: this.interpolate(template.text, variables),
    };
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }, template);
  }
}
