import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '@infrastructure/prisma';
import { RedisService } from '@infrastructure/redis';
import { createE2EApp } from './e2e-app.factory';
import { createCapturingMailProvider } from './e2e-mail.helper';
import { cleanupE2EInfrastructure } from './e2e-cleanup.helper';
import { disconnectE2ERedis, resetE2ERedis } from './e2e-redis.helper';

export interface E2EContext {
  app: INestApplication;
  baseUrl: string;
  mailProvider: ReturnType<typeof createCapturingMailProvider>;
  prisma: PrismaService;
  redis: Redis;
}

export async function bootstrapE2EContext(): Promise<E2EContext> {
  process.env['DEFAULT_TENANT_SLUG'] =
    process.env['DEFAULT_TENANT_SLUG']?.trim() || 'adhitama';
  process.env['PASSWORD_RESET_URL'] =
    process.env['PASSWORD_RESET_URL']?.trim() ||
    'https://app.example.com/reset?token={{token}}';
  process.env['EMAIL_VERIFICATION_URL'] =
    process.env['EMAIL_VERIFICATION_URL']?.trim() ||
    'https://app.example.com/verify?token={{token}}';

  const mailProvider = createCapturingMailProvider();
  const app = await createE2EApp({ mailProvider });
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpServer().address();
  if (typeof address === 'string' || address === null) {
    throw new Error('Failed to resolve E2E server port');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  const prisma = app.get(PrismaService);
  const redisClient = app.get(RedisService).getClient();

  await cleanupE2EInfrastructure(prisma, redisClient);
  await resetE2ERedis(redisClient);

  return {
    app,
    baseUrl,
    mailProvider,
    prisma,
    redis: redisClient,
  };
}

export async function teardownE2EContext(context: E2EContext): Promise<void> {
  if (!context) {
    return;
  }

  await cleanupE2EInfrastructure(context.prisma, context.redis);
  await disconnectE2ERedis(context.redis);

  await context.app.close();
}
