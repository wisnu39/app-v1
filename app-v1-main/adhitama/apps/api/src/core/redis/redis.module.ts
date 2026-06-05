import { Global, Module } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis';

/**
 * RedisModule — Core Redis infrastructure module.
 *
 * Marked as @Global so RedisService is available application-wide
 * without importing RedisModule in every feature module.
 *
 * Import chain:
 *   AppModule
 *     → RedisModule (global)
 *       → RedisService
 *           → CacheModule    (Task 2.2.5)
 *           → Auth blacklist (Phase 2)
 *           → Session store  (Phase 2)
 *
 * Rules:
 *   - Import RedisModule ONCE in AppModule only
 *   - DO NOT import RedisModule in any business module
 *   - RedisService is accessible in all modules via DI automatically
 *   - ConfigModule MUST be loaded before RedisModule
 *     (RedisService reads config via ConfigService in its constructor)
 *
 * Non-fatal design:
 *   - RedisService does not throw on connection failure at startup
 *   - App remains functional; Redis-dependent features degrade gracefully
 *   - Use redisService.isReady() to guard Redis operations
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
