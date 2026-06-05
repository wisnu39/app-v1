import { PrismaService } from '@infrastructure/prisma';

export async function cleanupAuthTestData(
  prismaService: PrismaService,
  tenantId?: string,
): Promise<void> {
  await prismaService.passwordResetToken.deleteMany({
    where: { tenantId: tenantId ?? undefined },
  });

  await prismaService.emailVerificationToken.deleteMany({
    where: { tenantId: tenantId ?? undefined },
  });

  await prismaService.session.deleteMany({
    where: { tenantId: tenantId ?? undefined },
  });
}
