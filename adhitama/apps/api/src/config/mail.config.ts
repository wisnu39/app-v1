import { registerAs } from '@nestjs/config';

export type MailProviderName = 'none' | 'smtp';

export interface MailConfig {
  provider: MailProviderName;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string | null;
  smtpPassword: string | null;
  fromEmail: string;
  fromName: string;
  emailVerificationUrl: string | null;
  passwordResetUrl: string | null;
}

export const mailConfig = registerAs('mail', (): MailConfig => ({
  provider: (process.env['MAIL_PROVIDER'] ?? 'none') as MailProviderName,
  smtpHost: process.env['MAIL_SMTP_HOST'] ?? '',
  smtpPort: parseInt(process.env['MAIL_SMTP_PORT'] ?? '587', 10),
  smtpSecure: (process.env['MAIL_SMTP_SECURE'] ?? 'false') === 'true',
  smtpUsername: process.env['MAIL_SMTP_USERNAME'] ?? null,
  smtpPassword: process.env['MAIL_SMTP_PASSWORD'] ?? null,
  fromEmail: process.env['MAIL_SMTP_FROM'] ?? '',
  fromName: process.env['MAIL_SMTP_FROM_NAME'] ?? 'Adhitama ERP',
  emailVerificationUrl: process.env['EMAIL_VERIFICATION_URL'] ?? null,
  passwordResetUrl: process.env['PASSWORD_RESET_URL'] ?? null,
}));
