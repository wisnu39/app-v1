import { NOTIFICATION_TEMPLATE_NAME } from '../constants/notification.constants';

interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
}

export const NOTIFICATION_TEMPLATES: Record<
  (typeof NOTIFICATION_TEMPLATE_NAME)[keyof typeof NOTIFICATION_TEMPLATE_NAME],
  NotificationTemplate
> = {
  [NOTIFICATION_TEMPLATE_NAME.EMAIL_VERIFICATION]: {
    subject: 'Verify your email address',
    html: `
      <p>Hi,</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p><a href="{{verificationUrl}}">Verify email</a></p>
      <p>If you did not request this, please ignore this message.</p>
    `,
    text: 'Please verify your email address using the following link: {{verificationUrl}}',
  },
  [NOTIFICATION_TEMPLATE_NAME.PASSWORD_RESET]: {
    subject: 'Reset your password',
    html: `
      <p>Hi,</p>
      <p>Use the link below to reset your password:</p>
      <p><a href="{{resetUrl}}">Reset password</a></p>
      <p>If you did not request a password reset, ignore this message.</p>
    `,
    text: 'Use the link below to reset your password: {{resetUrl}}',
  },
  [NOTIFICATION_TEMPLATE_NAME.GENERIC]: {
    subject: 'You have a new message from Adhitama ERP',
    html: `
      <p>Hi,</p>
      <p>{{message}}</p>
    `,
    text: '{{message}}',
  },
};
