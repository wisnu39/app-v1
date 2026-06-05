import { registerAs } from '@nestjs/config';

/**
 * App Config — application-level environment variables.
 *
 * Namespace : 'app'
 * Access    : configService.get<AppConfig>('app')
 *
 * Values here are already validated by validationSchema at bootstrap.
 * All non-null assertions are safe — Joi enforces presence before
 * these factories run.
 */
export interface AppConfig {
  /** Runtime environment: development | staging | production | test */
  nodeEnv: string;
  /** HTTP server port (default: 3000) */
  port: number;
  /** Convenience flag — true when NODE_ENV === 'development' */
  isDevelopment: boolean;
  /** Convenience flag — true when NODE_ENV === 'production' */
  isProduction: boolean;
}

export const appConfig = registerAs('app', (): AppConfig => {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';

  return {
    nodeEnv,
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
  };
});
