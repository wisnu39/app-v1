import type { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { SeedLogger } from './seed-logger.helper';
import type { SeededTenant } from './tenant.seeder';

/**
 * ownerSeeder — create the default OWNER user for the bootstrap tenant.
 *
 * Uses argon2 directly — NOT NestJS PasswordService.
 * Seeder runs outside the NestJS application lifecycle.
 *
 * Reads from env:
 *   SEED_OWNER_NAME     — full name
 *   SEED_OWNER_EMAIL    — email (login credential)
 *   SEED_OWNER_PASSWORD — plaintext password (hashed before storage)
 *
 * Idempotency:
 *   If OWNER user with this email already exists in tenant → skip.
 *   Password is NEVER overwritten on re-seed.
 *
 * Security:
 *   - Raw password never logged or stored
 *   - Argon2id with explicit params (matching PasswordService config)
 *   - mustChangePassword = true (force change on first login)
 *   - emailVerifiedAt = now() (owner account pre-verified)
 *   - NIP = null (OWNER role does not require NIP)
 */
export async function ownerSeeder(
  prisma: PrismaClient,
  tenant: SeededTenant,
): Promise<void> {
  SeedLogger.step('Seeding OWNER account');

  // ── Load + validate env vars ──────────────────────────────
  const ownerName     = process.env['SEED_OWNER_NAME']?.trim();
  const ownerEmail    = process.env['SEED_OWNER_EMAIL']?.trim().toLowerCase();
  const ownerPassword = process.env['SEED_OWNER_PASSWORD']?.trim();

  if (!ownerName || !ownerEmail || !ownerPassword) {
    throw new Error(
      '[SEED] Missing required env vars: SEED_OWNER_NAME, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD',
    );
  }

  // ── Find OWNER role for this tenant ───────────────────────
  const ownerRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'OWNER' },
    select: { id: true },
  });

  if (!ownerRole) {
    throw new Error(
      `[SEED] OWNER role not found for tenant "${tenant.slug}". ` +
        'Run roles seeder first.',
    );
  }

  // ── Idempotency: skip if owner already exists ─────────────
  const existing = await prisma.user.findFirst({
    where: { email: ownerEmail, tenantId: tenant.id },
    select: { id: true, email: true },
  });

  if (existing) {
    SeedLogger.skip(
      `OWNER user already exists: ${existing.email} — skipping (password preserved)`,
    );
    return;
  }

  // ── Hash password (argon2id, same config as PasswordService) ─
  const passwordHash = await argon2.hash(ownerPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  // Raw password is no longer referenced after this point

  // ── Create owner user ─────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        roleId: ownerRole.id,
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        nip: null,                         // OWNER does not require NIP
        status: 'ACTIVE',
        mustChangePassword: true,          // Force change on first login
        emailVerifiedAt: new Date(),       // Pre-verified for seed account
      },
      select: { id: true, email: true },
    });

    SeedLogger.success(
      `OWNER user created: ${user.email} (id: ${user.id})`,
    );
    SeedLogger.info('mustChangePassword = true — user must change password on first login');
  });
}
