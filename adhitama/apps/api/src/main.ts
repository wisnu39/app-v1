import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@common/filters';
import { ResponseInterceptor } from '@common/interceptors';

/**
 * Bootstrap — NestJS application entry point.
 *
 * Global registrations (order matters):
 *   1. ValidationPipe  — runs before controller handler, rejects bad input early
 *   2. ExceptionFilter — catches everything the pipe and handlers throw
 *   3. Interceptor     — wraps handler response after it returns
 *
 * Phase 1 (active):
 *   ✅ GlobalExceptionFilter  — standardized error responses (Task 2.3)
 *   ✅ ResponseInterceptor    — standardized success responses (Task 2.3)
 *   ✅ ValidationPipe         — DTO validation + transform (Task 2.3)
 *
 * Phase 2 — Auth & Security (upcoming):
 *   ⬜ Helmet           — secure HTTP headers
 *   ⬜ CORS             — whitelist-based origin policy
 *   ⬜ Rate limiting    — per-endpoint throttling
 *   ⬜ Swagger          — OpenAPI documentation
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── API Prefix ─────────────────────────────────────────────
  // Sesuai API_STANDARD.md: all endpoints under /api/v1
  app.setGlobalPrefix('api/v1');

  // ─── Global Validation Pipe ─────────────────────────────────
  // Applied before the controller handler is invoked.
  // Rejects requests with unknown or invalid fields immediately.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip any property not decorated with a class-validator decorator
      whitelist: true,

      // Reject (400) requests that contain non-whitelisted properties
      // Prevents clients from sending unexpected fields
      forbidNonWhitelisted: true,

      // Transform plain JS objects into DTO class instances
      // Required for type-safe DTO access in controllers
      transform: true,

      transformOptions: {
        // Allow implicit conversion: "1" → 1, "true" → true
        // Useful for @Query() params which arrive as strings
        enableImplicitConversion: true,
      },

      // Stop on first error per field (default: false = report all)
      // false = show all validation errors at once — better DX
      stopAtFirstError: false,
    }),
  );

  // ─── Global Exception Filter ────────────────────────────────
  // Catches all unhandled exceptions after the pipe and handler.
  // Registered as instance (not class) so it uses NestJS Logger DI.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Global Response Interceptor ────────────────────────────
  // Wraps all handler responses in the standard ApiSuccessResponse envelope.
  // Runs after the handler returns but before the response is sent.
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ─── Graceful Shutdown ──────────────────────────────────────
  // Required for PrismaService + RedisService onModuleDestroy to fire
  // on SIGTERM / SIGINT (Docker stop, Kubernetes pod eviction, etc.)
  app.enableShutdownHooks();

  // ─── Start Server ────────────────────────────────────────────
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  logger.log(`Adhitama API running on: http://localhost:${port}/api/v1`);
  logger.log(`Health check: http://localhost:${port}/api/v1/health`);
}

void bootstrap();
