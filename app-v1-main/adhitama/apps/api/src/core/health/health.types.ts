/**
 * Health Types — Adhitama ERP Health Check
 *
 * Defines the response shape for GET /api/v1/health.
 * Kept minimal and flat — no nested metric objects.
 */

/**
 * Status of a single infrastructure dependency.
 *
 * - 'healthy'  : dependency is reachable and responding normally
 * - 'degraded' : dependency is unreachable but non-critical (e.g. Redis)
 * - 'unhealthy': dependency is down and critical (e.g. database)
 */
export type DependencyStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Overall application health status.
 *
 * - 'healthy'  : all critical dependencies are up
 * - 'degraded' : some non-critical dependencies are down (app still functional)
 * - 'unhealthy': one or more critical dependencies are down (app impaired)
 */
export type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Result of a single dependency health check.
 */
export interface DependencyHealth {
  status: DependencyStatus;
  /** Human-readable message — useful for debugging */
  message: string;
  /** Round-trip time in milliseconds. Null if check failed immediately. */
  responseTimeMs: number | null;
}

/**
 * Full health check response payload.
 * Returned as the `data` field in the standard API response envelope.
 */
export interface HealthCheckResult {
  /** Overall application status — derived from dependency statuses */
  status: OverallStatus;
  /** ISO 8601 UTC timestamp of when the check was performed */
  timestamp: string;
  /** Individual dependency results */
  dependencies: {
    database: DependencyHealth;
    redis: DependencyHealth;
  };
}
