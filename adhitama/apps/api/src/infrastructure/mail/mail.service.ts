import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER_TOKEN } from './mail.constants';
import type { MailProvider, MailSendInput } from './types/mail.types';
import type { MailConfig } from '@config/mail.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly defaultFrom: string;

  constructor(
    @Inject(MAIL_PROVIDER_TOKEN) private readonly provider: MailProvider,
    private readonly configService: ConfigService,
  ) {
    const mailConfig = this.configService.get<MailConfig>('mail');
    this.defaultFrom = `${mailConfig?.fromName ?? 'Adhitama ERP'} <${mailConfig?.fromEmail ?? 'no-reply@example.com'}>`;
  }

  async sendMail(input: MailSendInput): Promise<void> {
    const mailPayload = {
      ...input,
      from: input.from ?? this.defaultFrom,
    };

    if (!mailPayload.html && !mailPayload.text) {
      throw new Error('Mail payload must contain html or text content.');
    }

    try {
      await this.provider.sendMail(mailPayload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `MailService failed to send email to=${mailPayload.to} subject=${mailPayload.subject}: ${message}`,
      );
      throw error;
    }
  }

  fireAndForgetMail(input: MailSendInput): void {
    void this.sendMail(input);
  }
}
