import type { PrismaClient } from '@prisma/client';
import { cleanupPrisma } from '../helpers/prisma-cleanup.helper';

export async function bootstrapPrismaTestDatabase(prisma: PrismaClient, tables: string[]): Promise<void> {
  await cleanupPrisma(prisma, tables);
}
