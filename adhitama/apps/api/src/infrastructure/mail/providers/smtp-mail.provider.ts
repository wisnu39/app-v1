import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { MailConfig, MailProvider, MailSendInput } from '../types/mail.types';

export class SmtpMailProvider implements MailProvider {
  private readonly logger = new Logger(SmtpMailProvider.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;

  constructor(private readonly config: MailConfig) {
    this.defaultFrom = `${this.config.fromName} <${this.config.fromEmail}>`;
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      auth: {
        user: this.config.smtpUsername ?? undefined,
        pass: this.config.smtpPassword ?? undefined,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendMail(input: MailSendInput): Promise<void> {
    const message = {
      from: input.from ?? this.defaultFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    };

    try {
      await this.transporter.sendMail(message);
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `SMTP sendMail failed to=${input.to} subject=${input.subject}: ${messageText}`,
      );
      throw error;
    }
  }
}
