import type { PrismaService } from '@infrastructure/prisma';
import type Redis from 'ioredis';

export async function cleanupE2EInfrastructure(
  prisma: PrismaService,
  redis: Redis,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.session.deleteMany();
    await tx.passwordResetToken.deleteMany();
    await tx.emailVerificationToken.deleteMany();
    await tx.rolePermission.deleteMany();
    await tx.user.deleteMany();
    await tx.role.deleteMany();
    await tx.tenant.deleteMany();
  });

  await redis.flushdb();
}
