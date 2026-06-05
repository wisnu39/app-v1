import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database Seeder — Adhitama ERP
 *
 * Seed data is added per phase alongside model creation.
 * Current phase: Foundation — no models, no seed data.
 *
 * Future seed order (per MASTER_IMPLEMENTATION_PLAN.md):
 *   1. Tenant (system default tenant)
 *   2. Role + Permission (RBAC foundation)
 *   3. Super Admin user
 *   4. Item categories (default)
 *   5. Warehouse (default)
 */
async function main(): Promise<void> {
  console.log('Adhitama ERP — Database Seeder');
  console.log('No seed data for current phase.');
}

main()
  .catch((error: unknown) => {
    console.error('Seeder failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
