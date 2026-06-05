import { Controller, Get, HttpCode, HttpStatus, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import type { HealthCheckResult } from './health.types';

/**
 * HealthController — handles GET /api/v1/health.
 *
 * Responsibilities (Controller rules from CODING_STANDARDS.md):
 *   - Route definition
 *   - Delegate to HealthService
 *   - Map result to HTTP response (status code + body)
 *   - NO business logic here
 *
 * HTTP Status Mapping:
 *   - 'healthy'  → 200 OK
 *   - 'degraded' → 200 OK   (app is functional, Redis is non-critical)
 *   - 'unhealthy'→ 503 Service Unavailable (database is down)
 *
 * Response Format:
 *   Follows API_STANDARD.md standard envelope:
 *   {
 *     "success": true | false,
 *     "message": "...",
 *     "data": { ...HealthCheckResult }
 *   }
 *
 * Security:
 *   - No authentication required (health endpoint must be publicly accessible)
 *   - Does NOT expose sensitive infrastructure details (passwords, URLs, etc.)
 *   - Response time in ms is safe to expose (no business data)
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/v1/health
   *
   * Returns the current health status of all infrastructure dependencies.
   * Uses raw Response object to set dynamic HTTP status codes.
   */
  @Get()
  @HttpCode(HttpStatus.OK) // Default — overridden dynamically for 503
  async getHealth(@Res() res: Response): Promise<void> {
    const result: HealthCheckResult = await this.healthService.check();

    const httpStatus = this.resolveHttpStatus(result.status);
    const success = httpStatus === Number(HttpStatus.OK);

    const message = this.resolveMessage(result.status);

    res.status(httpStatus).json({
      success,
      message,
      data: result,
    });
  }

  // ─── Private Helpers ───────────────────────────────────────

  private resolveHttpStatus(status: HealthCheckResult['status']): number {
    switch (status) {
      case 'healthy':
        return HttpStatus.OK;
      case 'degraded':
        // App is still functional — return 200 so load balancers
        // do not remove this instance from rotation
        return HttpStatus.OK;
      case 'unhealthy':
        return HttpStatus.SERVICE_UNAVAILABLE;
    }
  }

  private resolveMessage(status: HealthCheckResult['status']): string {
    switch (status) {
      case 'healthy':
        return 'All systems operational';
      case 'degraded':
        return 'System operational with degraded services';
      case 'unhealthy':
        return 'System unavailable — critical dependency down';
    }
  }
}
