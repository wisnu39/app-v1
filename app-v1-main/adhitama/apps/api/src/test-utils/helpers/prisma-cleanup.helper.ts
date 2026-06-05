import type { PrismaClient } from '@prisma/client';

export async function cleanupPrisma(prisma: PrismaClient, tables: string[] = []): Promise<void> {
  if (!tables.length) return;
  const truncates = tables.map((t) => `TRUNCATE TABLE "${t}" CASCADE;`).join(' ');
  await prisma.$executeRawUnsafe(truncates);
}
