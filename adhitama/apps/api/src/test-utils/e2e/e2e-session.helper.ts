import type { PrismaService } from '@infrastructure/prisma';

export async function createE2ESession(
  prisma: PrismaService,
  input: {
    tenantId: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt?: Date | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
) {
  return prisma.session.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      revokedAt: input.revokedAt ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function revokeE2ESession(prisma: PrismaService, refreshTokenHash: string) {
  return prisma.session.updateMany({
    where: {
      refreshTokenHash,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
