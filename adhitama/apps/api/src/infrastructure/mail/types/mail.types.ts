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
}

export interface MailSendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface MailProvider {
  sendMail(input: MailSendInput): Promise<void>;
}
