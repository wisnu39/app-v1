import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import { RedisService } from '@infrastructure/redis';
import type {
  DependencyHealth,
  HealthCheckResult,
  OverallStatus,
} from './health.types';

/**
 * HealthService — orchestrates infrastructure health checks.
 *
 * Responsibilities:
 *   - Check PostgreSQL connectivity via lightweight Prisma query
 *   - Check Redis connectivity via RedisService.ping()
 *   - Derive overall application status from dependency results
 *   - Return a typed HealthCheckResult
 *
 * Health Logic:
 *   - Database is CRITICAL  → unhealthy database = overall 'unhealthy'
 *   - Redis is NON-CRITICAL → unhealthy Redis = overall 'degraded' (not 'unhealthy')
 *   - Both healthy          → overall 'healthy'
 *
 * Performance:
 *   - Both checks run in parallel (Promise.all)
 *   - DB check uses SELECT 1 — does not touch any business table
 *   - Redis check uses PING — single round trip
 *   - Each check has an independent timeout guard
 *
 * Rules:
 *   - MUST NOT query any business table (Customer, Rental, etc.)
 *   - MUST NOT throw — all errors are caught and mapped to status
 *   - Response time is measured per dependency for observability
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  /** Timeout for each individual health check (ms) */
  private readonly CHECK_TIMEOUT_MS = 3000;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Run all health checks and return the aggregated result.
   * Both checks execute in parallel for minimal latency.
   */
  async check(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status = this.deriveOverallStatus(database, redis);

    if (status !== 'healthy') {
      this.logger.warn(
        `Health check status: ${status} | ` +
          `db=${database.status} | redis=${redis.status}`,
      );
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      dependencies: { database, redis },
    };
  }

  // ─── Private Checks ────────────────────────────────────────

  /**
   * PostgreSQL health check.
   *
   * Uses SELECT 1 via $queryRaw — the lightest possible query.
   * Does NOT touch any business table.
   * Times out after CHECK_TIMEOUT_MS.
   */
  private async checkDatabase(): Promise<DependencyHealth> {
    const start = Date.now();

    try {
      await this.withTimeout(
        this.prismaService.$queryRaw`SELECT 1`,
        this.CHECK_TIMEOUT_MS,
        'Database health check timed out',
      );

      return {
        status: 'healthy',
        message: 'PostgreSQL is reachable',
        responseTimeMs: Date.now() - start,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Database health check failed: ${message}`);

      return {
        status: 'unhealthy',
        message: `PostgreSQL is unreachable: ${message}`,
        responseTimeMs: Date.now() - start,
      };
    }
  }

  /**
   * Redis health check.
   *
   * Delegates to RedisService.ping() which sends PING and expects PONG.
   * Redis failure maps to 'degraded' — not 'unhealthy' — because
   * the app can function without Redis (cache miss, no session, etc.)
   * Times out after CHECK_TIMEOUT_MS.
   */
  private async checkRedis(): Promise<DependencyHealth> {
    const start = Date.now();

    try {
      const alive = await this.withTimeout(
        this.redisService.ping(),
        this.CHECK_TIMEOUT_MS,
        'Redis health check timed out',
      );

      if (alive) {
        return {
          status: 'healthy',
          message: 'Redis is reachable',
          responseTimeMs: Date.now() - start,
        };
      }

      return {
        status: 'degraded',
        message: 'Redis PING did not return PONG',
        responseTimeMs: Date.now() - start,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'degraded',
        message: `Redis is unreachable: ${message}`,
        responseTimeMs: Date.now() - start,
      };
    }
  }

  /**
   * Derives overall status from individual dependency results.
   *
   * Logic:
   *   - Any 'unhealthy' critical dep (database) → 'unhealthy'
   *   - Any 'degraded' non-critical dep (redis)  → 'degraded'
   *   - All 'healthy'                            → 'healthy'
   */
  private deriveOverallStatus(
    database: DependencyHealth,
    redis: DependencyHealth,
  ): OverallStatus {
    // Database is critical — its failure drives overall to unhealthy
    if (database.status === 'unhealthy') {
      return 'unhealthy';
    }

    // Redis is non-critical — its failure drives overall to degraded only
    if (redis.status === 'degraded' || redis.status === 'unhealthy') {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Wraps a promise with a timeout.
   * Throws with the provided message if the promise does not resolve in time.
   */
  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutMessage: string,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms),
    );

    return Promise.race([promise, timeout]);
  }
}
