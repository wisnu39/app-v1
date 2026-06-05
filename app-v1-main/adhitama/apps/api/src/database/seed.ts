/**
 * seed.ts — Adhitama ERP Database Seeder Entry Point
 *
 * Execution order (strict — do not reorder):
 *   1. permissions → must exist before roles can be assigned permissions
 *   2. tenant      → must exist before roles and users can be created
 *   3. roles       → must exist before owner user can be assigned a role
 *   4. owner       → creates the bootstrap admin account
 *
 * Run:
 *   npm run prisma:seed
 *
 * Required env vars:
 *   DATABASE_URL
 *   SEED_TENANT_NAME
 *   SEED_TENANT_SLUG
 *   SEED_OWNER_NAME
 *   SEED_OWNER_EMAIL
 *   SEED_OWNER_PASSWORD
 *
 * Idempotency:
 *   Safe to run multiple times — uses upsert + skipDuplicates + existence checks.
 *   Never deletes or overwrites existing tenant data.
 */

/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import {
  SeedLogger,
  permissionsSeeder,
  tenantSeeder,
  rolesSeeder,
  ownerSeeder,
} from './seeders/index';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  SeedLogger.divider();
  console.log('[SEED] Adhitama ERP — Database Seeder');
  console.log('[SEED] Environment:', process.env['NODE_ENV'] ?? 'development');
  SeedLogger.divider();

  // ── Step 1: Permissions ──────────────────────────────────
  // Global — not tenant-scoped. Must run first.
  await permissionsSeeder(prisma);

  // ── Step 2: Tenant ───────────────────────────────────────
  // Bootstrap tenant. Returns tenant record for subsequent seeders.
  const tenant = await tenantSeeder(prisma);

  // ── Step 3: Roles + Permission Assignment ────────────────
  // System roles for the bootstrap tenant.
  // Assigns permissions from ROLE_PERMISSION_MAP.
  await rolesSeeder(prisma, tenant);

  // ── Step 4: Owner Account ────────────────────────────────
  // Bootstrap admin user assigned OWNER role.
  await ownerSeeder(prisma, tenant);

  SeedLogger.divider();
  SeedLogger.success('Seeding complete');
  SeedLogger.divider();
}

main()
  .catch((error: unknown) => {
    SeedLogger.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
