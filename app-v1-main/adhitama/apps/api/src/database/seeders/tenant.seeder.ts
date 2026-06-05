import type { PrismaClient } from '@prisma/client';
import { SeedLogger } from './seed-logger.helper';

export interface SeededTenant {
  id: string;
  name: string;
  slug: string;
}

/**
 * tenantSeeder — create the default bootstrap tenant.
 *
 * Reads from env:
 *   SEED_TENANT_NAME — display name
 *   SEED_TENANT_SLUG — unique slug
 *
 * Idempotent: if slug already exists, returns existing tenant.
 */
export async function tenantSeeder(prisma: PrismaClient): Promise<SeededTenant> {
  SeedLogger.step('Seeding default tenant');

  const name = process.env['SEED_TENANT_NAME']?.trim();
  const slug = process.env['SEED_TENANT_SLUG']?.trim();

  if (!name || !slug) {
    throw new Error(
      '[SEED] Missing SEED_TENANT_NAME or SEED_TENANT_SLUG environment variables',
    );
  }

  const existing = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (existing) {
    SeedLogger.skip(`Tenant already exists: "${existing.name}" (${existing.slug})`);
    return existing;
  }

  const tenant = await prisma.tenant.create({
    data: { name, slug, status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
  });

  SeedLogger.success(`Tenant created: "${tenant.name}" (${tenant.slug})`);
  return tenant;
}
