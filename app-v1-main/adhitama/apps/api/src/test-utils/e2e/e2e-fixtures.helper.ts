import type { PrismaService } from '@infrastructure/prisma';
import { createE2ERole, createE2ETenant, createE2EUser, createE2EEmailVerificationToken, createE2EPasswordResetToken, createHashFromToken } from './e2e-prisma.helper';

export interface SeededAuthRecord {
  tenant: Awaited<ReturnType<typeof createE2ETenant>>;
  role: Awaited<ReturnType<typeof createE2ERole>>;
  user: Awaited<ReturnType<typeof createE2EUser>>;
}

export async function seedAuthFixture(
  prisma: PrismaService,
  overrides: Partial<{
    tenantSlug: string;
    tenantName: string;
    roleName: string;
    email: string;
    password: string;
    userName: string;
  }> = {},
): Promise<SeededAuthRecord> {
  const tenant = await createE2ETenant(prisma, {
    slug: overrides.tenantSlug ?? 'adhitama',
    name: overrides.tenantName ?? 'Adhitama',
  });

  const role = await createE2ERole(prisma, tenant.id, overrides.roleName ?? 'OWNER');

  const user = await createE2EUser(prisma, {
    tenantId: tenant.id,
    roleId: role.id,
    email: overrides.email ?? 'security@example.com',
    password: overrides.password ?? 'Password123!',
    name: overrides.userName ?? 'Security Tester',
  });

  return { tenant, role, user };
}

export async function seedVerificationToken(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  rawToken: string,
) {
  return createE2EEmailVerificationToken(prisma, {
    tenantId,
    userId,
    rawToken,
  });
}

export async function seedPasswordResetToken(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  rawToken: string,
) {
  return createE2EPasswordResetToken(prisma, {
    tenantId,
    userId,
    rawToken,
  });
}

export function normalizeTokenHash(rawToken: string): string {
  return createHashFromToken(rawToken);
}
