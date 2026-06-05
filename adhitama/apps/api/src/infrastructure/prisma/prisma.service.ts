import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — Prisma Client wrapper for NestJS DI.
 *
 * Responsibilities:
 *   - Provide a singleton PrismaClient instance via NestJS DI
 *   - Manage connection lifecycle (connect on init, disconnect on destroy)
 *   - Support graceful shutdown via enableShutdownHooks
 *
 * Rules (CODING_STANDARDS.md & ARCHITECTURE.md):
 *   - This is the ONLY class that instantiates PrismaClient
 *   - Controllers MUST NOT inject PrismaService directly
 *   - Services MUST NOT inject PrismaService directly
 *   - Only Repository classes may inject PrismaService
 *
 * Not in scope for this task:
 *   - Query logging middleware (future: logging phase)
 *   - Transaction helper abstraction (future: per-module need)
 *   - Soft delete middleware (future: per-model need)
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Connect to the database when the NestJS module initializes.
   * Called automatically by the NestJS lifecycle.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error: unknown) {
      this.logger.error(
        'Database connection failed',
        error instanceof Error ? error.stack : String(error),
      );
      // Re-throw so NestJS bootstrap fails fast on DB unavailability
      throw error;
    }
  }

  /**
   * Disconnect from the database when the NestJS module is destroyed.
   * Called automatically by the NestJS lifecycle on graceful shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error: unknown) {
      this.logger.error(
        'Database disconnect error',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
