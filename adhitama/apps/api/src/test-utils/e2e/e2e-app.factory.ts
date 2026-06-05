import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MailService } from '@infrastructure/mail/mail.service';
import type { MailProvider } from '@infrastructure/mail';
import { GlobalExceptionFilter } from '@common/filters';
import { ResponseInterceptor } from '@common/interceptors';
import { AppModule } from '../../app.module';

export interface CreateE2EAppOptions {
  mailProvider?: MailProvider;
}

export async function createE2EApp(
  options: CreateE2EAppOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();

  await app.init();

  if (options.mailProvider) {
    const mailService = app.get(MailService);
    Reflect.set(mailService, 'provider', options.mailProvider);
  }

  return app;
}
