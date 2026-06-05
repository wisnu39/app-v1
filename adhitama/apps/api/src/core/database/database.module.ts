import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';

/**
 * DatabaseModule — Core database infrastructure module.
 *
 * Marked as @Global so PrismaService is available application-wide
 * without importing DatabaseModule in every feature module.
 *
 * Import chain:
 *   AppModule
 *     → DatabaseModule (global)
 *       → PrismaService
 *           → Repository (per module, injected via DI)
 *
 * Rules:
 *   - Import DatabaseModule ONCE in AppModule only
 *   - Do NOT import DatabaseModule in any business module
 *   - PrismaService is accessible in all modules via DI automatically
 *
 * Graceful shutdown:
 *   - NestJS calls onModuleDestroy on PrismaService automatically
 *   - app.enableShutdownHooks() in main.ts activates OS signal handling
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
