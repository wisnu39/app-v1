import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MAIL_PROVIDER_TOKEN, MAIL_PROVIDER_NAME } from './mail.constants';
import { NoopMailProvider } from './providers/noop-mail.provider';
import { SmtpMailProvider } from './providers/smtp-mail.provider';
import type { MailConfig } from './types/mail.types';

@Module({
  providers: [
    MailService,
    {
      provide: MAIL_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService): NoopMailProvider | SmtpMailProvider => {
        const config = configService.get<MailConfig>('mail');

        if (!config || config.provider !== MAIL_PROVIDER_NAME.SMTP) {
          return new NoopMailProvider();
        }

        return new SmtpMailProvider(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
