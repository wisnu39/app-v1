import { Logger } from '@nestjs/common';
import type { MailProvider, MailSendInput } from '../types/mail.types';

export class NoopMailProvider implements MailProvider {
  private readonly logger = new Logger(NoopMailProvider.name);

  sendMail(input: MailSendInput): Promise<void> {
    this.logger.warn(
      `Mail provider disabled or unavailable. Skipping email send to=${input.to} subject=${input.subject}`,
    );
    return Promise.resolve();
  }
}
