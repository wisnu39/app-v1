import type { PrismaService } from '@infrastructure/prisma';

export async function getAuditEvents(
  prisma: PrismaService,
  query: {
    tenantId?: string;
    action?: string;
    entityId?: string;
    actorUserId?: string | null;
  },
) {
  return prisma.auditLog.findMany({
    where: {
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorUserId !== undefined ? { actorUserId: query.actorUserId } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
