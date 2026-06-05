import { registerAs } from '@nestjs/config';

/**
 * Database Config — PostgreSQL / Prisma connection variables.
 *
 * Namespace : 'database'
 * Access    : configService.get<DatabaseConfig>('database')
 *
 * Note: DATABASE_URL is consumed directly by Prisma via schema.prisma
 * env() call. This config namespace makes the URL available to other
 * infrastructure consumers (e.g. health check, migration tooling).
 *
 * Non-null assertion is safe — Joi validation enforces DATABASE_URL
 * presence and format before this factory runs.
 */
export interface DatabaseConfig {
  /** Full PostgreSQL connection string */
  url: string;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env['DATABASE_URL'] as string,
  }),
);
