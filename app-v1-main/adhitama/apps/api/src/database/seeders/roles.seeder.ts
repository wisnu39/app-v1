import type { PrismaClient } from '@prisma/client';
import {
  SYSTEM_ROLE_DEFINITIONS,
  ROLE_PERMISSION_MAP,
} from '../constants/system-roles.constant';
import { SeedLogger } from './seed-logger.helper';
import type { SeededTenant } from './tenant.seeder';

/**
 * rolesSeeder — seed system roles + assign permissions for a tenant.
 *
 * Flow (inside a transaction):
 *   1. Upsert each role by (tenantId + name) — idempotent
 *   2. Load all permission IDs matching the role's key list
 *   3. Assign permissions via createMany + skipDuplicates — additive, never removes
 *
 * Idempotency:
 *   - Role upsert: safe to run many times
 *   - Permission assignment: skipDuplicates prevents duplicates
 *   - Never removes existing role-permission assignments
 */
export async function rolesSeeder(
  prisma: PrismaClient,
  tenant: SeededTenant,
): Promise<void> {
  SeedLogger.step(`Seeding system roles for tenant: ${tenant.slug}`);

  await prisma.$transaction(async (tx) => {
    for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
      // Upsert role by tenantId + name
      const role = await tx.role.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: roleDef.name,
          },
        },
        create: {
          tenantId: tenant.id,
          name: roleDef.name,
          description: roleDef.description,
        },
        update: {
          description: roleDef.description,
        },
        select: { id: true, name: true },
      });

      SeedLogger.info(`Role upserted: ${role.name}`);

      // Load permission keys assigned to this role
      const permissionKeys = ROLE_PERMISSION_MAP[roleDef.name] ?? [];
      if (permissionKeys.length === 0) {
        SeedLogger.warn(`No permissions mapped for role: ${roleDef.name}`);
        continue;
      }

      // Fetch permission IDs matching the key list
      const permissions = await tx.permission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true, key: true },
      });

      const foundKeys = permissions.map((p) => p.key);
      const missingKeys = permissionKeys.filter((k) => !foundKeys.includes(k));

      if (missingKeys.length > 0) {
        SeedLogger.warn(
          `Role "${roleDef.name}" — missing permissions (not seeded yet?): ` +
            missingKeys.join(', '),
        );
      }

      // Assign permissions — skipDuplicates makes this additive and idempotent
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        });
      }

      SeedLogger.info(
        `  Permissions assigned: ${permissions.length} / ${permissionKeys.length}`,
      );
    }
  });

  SeedLogger.success(
    `System roles seeded: ${SYSTEM_ROLE_DEFINITIONS.length} roles`,
  );
}
