import type { PrismaClient } from '@prisma/client';
import { PERMISSION_DEFINITIONS, PERMISSION_COUNT } from '../constants/permissions.constant';
import { SeedLogger } from './seed-logger.helper';

/**
 * permissionsSeeder — upsert all system permissions.
 *
 * Strategy: upsert by key — idempotent, safe to run many times.
 * Updates description/module if key already exists.
 * Never deletes permissions.
 */
export async function permissionsSeeder(prisma: PrismaClient): Promise<void> {
  SeedLogger.step('Seeding permissions');

  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        module: def.module,
        description: def.description,
      },
      update: {
        module: def.module,
        description: def.description,
      },
    });
  }

  SeedLogger.success(`Permissions seeded: ${PERMISSION_COUNT}`);
}
