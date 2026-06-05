import { PrismaService } from '@infrastructure/prisma';
import { PasswordService } from '@infrastructure/password';
import { createHash, randomUUID } from 'crypto';

export function createE2EPrisma(): PrismaService {
  return new PrismaService();
}

export async function connectE2EPrisma(prisma: PrismaService): Promise<void> {
  await prisma.$connect();
}

export async function disconnectE2EPrisma(prisma: PrismaService): Promise<void> {
  await prisma.$disconnect();
}

export async function resetE2EPrisma(prisma: PrismaService): Promise<void> {
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
}

export async function createE2ETenant(
  prisma: PrismaService,
  overrides: Partial<{
    slug: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  }> = {},
) {
  const slug = overrides.slug ?? `tenant-${randomUUID().slice(0, 8)}`;

  return prisma.tenant.create({
    data: {
      name: overrides.name ?? `Tenant ${slug}`,
      slug,
      status: overrides.status ?? 'ACTIVE',
    },
  });
}

export async function createE2ERole(
  prisma: PrismaService,
  tenantId: string,
  name = 'OWNER',
) {
  return prisma.role.create({
    data: {
      tenantId,
      name,
      description: `${name} role for E2E`,
    },
  });
}

export async function createE2EUser(
  prisma: PrismaService,
  input: {
    tenantId: string;
    roleId: string;
    email: string;
    password: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    emailVerifiedAt?: Date | null;
    mustChangePassword?: boolean;
    name?: string;
    nip?: string | null;
  },
) {
  const passwordService = new PasswordService();
  const passwordHash = await passwordService.hash(input.password);

  return prisma.user.create({
    data: {
      tenantId: input.tenantId,
      roleId: input.roleId,
      name: input.name ?? 'E2E User',
      email: input.email,
      passwordHash,
      status: input.status ?? 'ACTIVE',
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      mustChangePassword: input.mustChangePassword ?? false,
      nip: input.nip ?? null,
    },
  });
}

export async function createE2EEmailVerificationToken(
  prisma: PrismaService,
  input: {
    tenantId: string;
    userId: string;
    rawToken: string;
    expiresAt?: Date;
    usedAt?: Date | null;
  },
) {
  const hash = createHashFromToken(input.rawToken);

  return prisma.emailVerificationToken.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      tokenHash: hash,
      expiresAt: input.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      usedAt: input.usedAt ?? null,
    },
  });
}

export async function createE2EPasswordResetToken(
  prisma: PrismaService,
  input: {
    tenantId: string;
    userId: string;
    rawToken: string;
    expiresAt?: Date;
    usedAt?: Date | null;
  },
) {
  const hash = createHashFromToken(input.rawToken);

  return prisma.passwordResetToken.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      tokenHash: hash,
      expiresAt: input.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      usedAt: input.usedAt ?? null,
    },
  });
}

export function createHashFromToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
