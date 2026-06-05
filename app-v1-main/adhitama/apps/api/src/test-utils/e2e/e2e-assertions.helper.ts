import type { PrismaService } from '@infrastructure/prisma';
import type { CapturingMailProvider } from './e2e-mail.helper';

export type AuditEventRecord = Awaited<ReturnType<PrismaService['auditLog']['findMany']>>;

export async function expectNoSensitiveMetadata(
  prisma: PrismaService,
  filters: {
    tenantId?: string;
    action?: string;
    entityId?: string;
    actorUserId?: string | null;
  },
  rawToken?: string,
): Promise<void> {
  const events = await prisma.auditLog.findMany({
    where: {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.actorUserId !== undefined ? { actorUserId: filters.actorUserId } : {}),
    },
  });

  const serialized = JSON.stringify(events);

  expect(serialized).not.toContain('password');
  expect(serialized).not.toContain('refreshToken');
  if (rawToken) {
    expect(serialized).not.toContain(rawToken);
  }
}

export function expectCapturedMailToken(
  mailProvider: CapturingMailProvider,
  rawToken: string,
): void {
  const latestMessage = mailProvider.getLatestSentMessage();
  expect(latestMessage).toBeDefined();
  expect(JSON.stringify(latestMessage)).toContain(rawToken);
}
