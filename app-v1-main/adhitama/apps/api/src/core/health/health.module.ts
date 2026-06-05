import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * HealthModule — infrastructure health visibility module.
 *
 * Exposes:
 *   GET /api/v1/health
 *
 * Dependencies (injected via global modules — no explicit import needed):
 *   - PrismaService  (from @Global DatabaseModule)
 *   - RedisService   (from @Global RedisModule)
 *   - ConfigService  (from @Global ConfigModule)
 *
 * TerminusModule:
 *   Imported for future extensibility (readiness/liveness probes,
 *   additional health indicators). Not actively used in this phase —
 *   HealthService implements its own lightweight check logic to keep
 *   the response format aligned with API_STANDARD.md.
 *
 * Not @Global — HealthModule is self-contained and not needed elsewhere.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
