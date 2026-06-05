// ─── Module ──────────────────────────────────────────────────
export { ConfigModule } from './config.module';

// ─── Config Factories ─────────────────────────────────────────
export { appConfig } from './app.config';
export { authConfig } from './auth.config';
export { databaseConfig } from './database.config';
export { redisConfig } from './redis.config';
export { mailConfig } from './mail.config';

// ─── Config Interfaces (typed access) ──────────────────────────────────────
export type { AppConfig } from './app.config';
export type { AuthConfig } from './auth.config';
export type { DatabaseConfig } from './database.config';
export type { RedisConfig } from './redis.config';
export type { MailConfig } from './mail.config';
