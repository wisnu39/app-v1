import { Module } from '@nestjs/common';
import { MailModule } from '@infrastructure/mail';
import { AuditModule } from '@modules/audit/audit.module';
import { NotificationService } from './services/notification.service';
import { NotificationTemplateRenderer } from './helpers/notification-template-renderer.helper';

@Module({
  imports: [MailModule, AuditModule],
  providers: [NotificationService, NotificationTemplateRenderer],
  exports: [NotificationService],
})
export class NotificationModule {}
