import { registerAs } from '@nestjs/config';

/**
 * Redis Config — Redis connection variables.
 *
 * Namespace : 'redis'
 * Access    : configService.get<RedisConfig>('redis')
 *
 * Consumed by:
 *   - RedisModule     (Task 2.2.4)
 *   - CacheModule     (Task 2.2.5)
 *   - Auth blacklist  (Phase 2)
 *   - Session cache   (Phase 2)
 *
 * Non-null assertions are safe — Joi validation enforces presence
 * before these factories run.
 */
export interface RedisConfig {
  /** Redis server hostname or IP */
  host: string;
  /** Redis server port (default: 6379) */
  port: number;
  /** Redis authentication password */
  password: string;
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] as string,
  }),
);
