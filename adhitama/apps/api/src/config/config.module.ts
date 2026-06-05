import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { validationSchema } from './validation.schema';
import { appConfig } from './app.config';
import { authConfig } from './auth.config';
import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { mailConfig } from './mail.config';

/**
 * ConfigModule — Global configuration and environment validation module.
 *
 * Responsibilities:
 *   - Validate all required environment variables at bootstrap (fail-fast)
 *   - Load typed config namespaces: app, database, redis
 *   - Expose ConfigService globally via @Global + isGlobal: true
 *
 * Import order rule (app.module.ts):
 *   ConfigModule MUST be the FIRST import in AppModule.
 *   Reason: DatabaseModule and RedisModule depend on validated env vars
 *   being available when they initialize their connections.
 *
 * Usage in any injectable class:
 *   constructor(private readonly configService: ConfigService) {}
 *   const dbUrl = this.configService.get<DatabaseConfig>('database').url;
 *
 * DILARANG (CODING_STANDARDS.md):
 *   - process.env['VAR'] used directly in modules/services
 *   - ConfigService imported without going through DI
 *   - Additional config namespaces added without updating validationSchema
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      // ─── Config Namespaces ──────────────────────────────────
      // Typed config factories — each maps to a namespace key.
      // Order does not matter here; all are loaded before any module
      // accesses them via ConfigService.
      // Phase 2 (Auth): authConfig added — JWT secrets and expiry.
      load: [appConfig, authConfig, databaseConfig, redisConfig, mailConfig],

      // ─── Validation ─────────────────────────────────────────
      // Joi schema from separate file for maintainability.
      // App will NOT start if any required variable is missing or invalid.
      validationSchema,

      validationOptions: {
        // Show ALL validation errors at once — not just the first failure.
        // This makes fixing missing .env vars much faster.
        abortEarly: false,

        // Allow extra OS-injected env vars (CI/CD, Docker, etc.)
        // without causing validation errors.
        allowUnknown: true,
      },

      // ─── Availability ───────────────────────────────────────
      // isGlobal: true makes ConfigService available everywhere
      // without re-importing ConfigModule in each feature module.
      isGlobal: true,

      // Cache parsed config values — avoids re-parsing on every
      // ConfigService.get() call. Values are immutable after bootstrap.
      cache: true,
    }),
  ],
})
export class ConfigModule {}
