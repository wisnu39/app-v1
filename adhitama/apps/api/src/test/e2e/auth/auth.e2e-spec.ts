/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument, @typescript-eslint/await-thenable */
import { MailService } from '@infrastructure/mail/mail.service';
import { PasswordService } from '@infrastructure/password';
import { cleanupE2EInfrastructure } from '../../../test-utils/e2e/e2e-cleanup.helper';
import { expectNoSensitiveMetadata } from '../../../test-utils/e2e/e2e-assertions.helper';
import { createFailingMailProvider } from '../../../test-utils/e2e/e2e-mail.helper';
import { createE2EHttpClient, loginE2E, refreshE2E, requestPasswordResetE2E, resetPasswordE2E, verifyEmailE2E } from '../../../test-utils/e2e/e2e-http.helper';
import { createE2ETenant, createE2ERole, createE2EUser } from '../../../test-utils/e2e/e2e-prisma.helper';
import { seedAuthFixture, seedPasswordResetToken, seedVerificationToken } from '../../../test-utils/e2e/e2e-fixtures.helper';
import { bootstrapE2EContext, teardownE2EContext } from '../../../test-utils/e2e/e2e-test.bootstrap';

const passwordService = new PasswordService();

describe('Auth E2E security validation', () => {
  let context: Awaited<ReturnType<typeof bootstrapE2EContext>>;
  let httpClient: ReturnType<typeof createE2EHttpClient>;

  beforeAll(async () => {
    context = await bootstrapE2EContext();
    httpClient = createE2EHttpClient(context.app);
  });

  beforeEach(async () => {
    await cleanupE2EInfrastructure(context.prisma, context.redis);
    context.mailProvider.clear();
    const mailService = context.app.get(MailService);
    Reflect.set(mailService, 'provider', context.mailProvider);
  });

  afterAll(async () => {
    await teardownE2EContext(context);
  });

  async function seedTenantAndUser() {
    return seedAuthFixture(context.prisma);
  }

  it('logs in successfully and returns real auth tokens', async () => {
    await seedTenantAndUser();

    const response = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();
    expect(response.body.data.user.email).toBe('security@example.com');
  });

  it('rotates refresh tokens and revokes the replayed token', async () => {
    const { user } = await seedTenantAndUser();

    const loginResponse = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    const originalRefreshToken = loginResponse.body.data.refreshToken;

    const refreshResponse = await refreshE2E(httpClient, originalRefreshToken);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.refreshToken).toBeTruthy();
    expect(refreshResponse.body.data.refreshToken).not.toBe(originalRefreshToken);

    const replayResponse = await refreshE2E(httpClient, originalRefreshToken);

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.success).toBe(false);
    expect(replayResponse.body.message).toContain('invalid or has already been used');

    const sessions = await context.prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.filter((session) => session.revokedAt === null)).toHaveLength(0);
    expect(sessions.filter((session) => session.revokedAt !== null)).toHaveLength(sessions.length);
  });

  it('revokes all sessions and changes password after reset', async () => {
    const { user } = await seedTenantAndUser();

    const loginResponse = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    const refreshToken = loginResponse.body.data.refreshToken;

    const requestResetResponse = await requestPasswordResetE2E(httpClient, 'security@example.com');

    expect(requestResetResponse.status).toBe(200);
    const resetEmail = context.mailProvider.getLatestSentMessage();
    expect(resetEmail).toBeDefined();

    const token = context.mailProvider.extractTokenFromLatestMessage();
    expect(token).toBeTruthy();

    if (!token) {
      throw new Error('Password reset token missing from captured email');
    }

    const resetResponse = await resetPasswordE2E(httpClient, token, 'NewPassword123!');

    expect(resetResponse.status).toBe(200);

    const updatedUser = await context.prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser).toBeDefined();
    await expect(passwordService.verify('NewPassword123!', updatedUser!.passwordHash)).resolves.toBe(true);

    const revokedSessions = await context.prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(revokedSessions.length).toBeGreaterThan(0);
    revokedSessions.forEach((session) => {
      expect(session.revokedAt).not.toBeNull();
    });

    const replayResponse = await refreshE2E(httpClient, refreshToken);

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.success).toBe(false);
    expect(replayResponse.body.message).toContain('invalid or has already been used');

    await expectNoSensitiveMetadata(
      context.prisma,
      {
        tenantId: user.tenantId,
        action: 'PASSWORD_RESET_SUCCESS',
        entityId: user.id,
      },
      token,
    );
  });

  it('replays password reset tokens only once under concurrent reuse', async () => {
    const { user } = await seedTenantAndUser();

    await requestPasswordResetE2E(httpClient, 'security@example.com');

    const token = context.mailProvider.extractTokenFromLatestMessage();
    expect(token).toBeTruthy();

    if (!token) {
      throw new Error('Password reset token missing from email');
    }

    const [firstResponse, secondResponse] = await Promise.all([
      resetPasswordE2E(httpClient, token, 'ConcurrentPassword123!'),
      resetPasswordE2E(httpClient, token, 'ConcurrentPassword456!'),
    ]);

    const successCount = [firstResponse.status, secondResponse.status].filter((status) => status === 200).length;
    const failureCount = [firstResponse.status, secondResponse.status].filter((status) => status !== 200).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    const updatedUser = await context.prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser).toBeDefined();

    const firstMatch = await passwordService.verify('ConcurrentPassword123!', updatedUser!.passwordHash);
    const secondMatch = await passwordService.verify('ConcurrentPassword456!', updatedUser!.passwordHash);

    expect(firstMatch).not.toBe(secondMatch);
    expect([firstMatch, secondMatch].filter(Boolean)).toHaveLength(1);
  });

  it('replays email verification tokens only once under concurrent reuse', async () => {
    const { user } = await seedTenantAndUser();

    const rawToken = 'a'.repeat(96);
    await seedVerificationToken(context.prisma, user.id, user.tenantId, rawToken);

    const [firstResponse, secondResponse] = await Promise.all([
      verifyEmailE2E(httpClient, rawToken),
      verifyEmailE2E(httpClient, rawToken),
    ]);

    expect([firstResponse.status, secondResponse.status].filter((status) => status === 200)).toHaveLength(1);
    expect([firstResponse.status, secondResponse.status].filter((status) => status !== 200)).toHaveLength(1);

    const updatedUser = await context.prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.emailVerifiedAt).toBeTruthy();
  });

  it('replays refresh tokens only once under concurrent reuse', async () => {
    await seedTenantAndUser();

    const loginResponse = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    const refreshToken = loginResponse.body.data.refreshToken;

    const [firstResponse, secondResponse] = await Promise.all([
      refreshE2E(httpClient, refreshToken),
      refreshE2E(httpClient, refreshToken),
    ]);

    expect([firstResponse.status, secondResponse.status].filter((status) => status === 200)).toHaveLength(1);
    expect([firstResponse.status, secondResponse.status].filter((status) => status !== 200)).toHaveLength(1);
  });

  it('rejects refresh attempts for revoked sessions', async () => {
    const { user } = await seedTenantAndUser();

    const loginResponse = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    const refreshToken = loginResponse.body.data.refreshToken;

    await context.prisma.session.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    const replayResponse = await refreshE2E(httpClient, refreshToken);

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.message).toContain('invalid or has already been used');
  });

  it('rejects cross-tenant access with a mismatched tenant host', async () => {
    await seedTenantAndUser();

    const secondTenant = await createE2ETenant(context.prisma, {
      slug: 'tenant-two',
      name: 'Tenant Two',
    });

    const secondRole = await createE2ERole(context.prisma, secondTenant.id, 'OWNER');
    await createE2EUser(context.prisma, {
      tenantId: secondTenant.id,
      roleId: secondRole.id,
      email: 'other@example.com',
      password: 'Password123!',
      name: 'Tenant Two User',
    });

    const loginResponse = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    const response = await httpClient
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .set('host', 'tenant-two.localhost');

    expect(response.status).toBe(401);
  });

  it('rejects invalid tenant host headers', async () => {
    await seedTenantAndUser();

    const response = await httpClient
      .get('/api/v1/auth/me')
      .set('host', 'unknown.invalid.example.com');

    expect(response.status).toBe(401);
  });

  it('rejects expired refresh tokens after session expiry is forced', async () => {
    await seedTenantAndUser();

    const loginResponse = await loginE2E(httpClient, {
      identifier: 'security@example.com',
      password: 'Password123!',
    });

    const session = await context.prisma.session.findFirst({
      where: { userId: loginResponse.body.data.user.id },
    });

    expect(session).toBeDefined();

    if (!session) {
      throw new Error('Session missing after login');
    }

    await context.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const refreshResponse = await refreshE2E(httpClient, loginResponse.body.data.refreshToken);

    expect(refreshResponse.status).toBe(401);
  });

  it('rejects malformed refresh tokens', async () => {
    await seedTenantAndUser();

    const response = await refreshE2E(httpClient, 'not-a-valid-jwt');

    expect(response.status).toBe(401);
  });

  it('falls back gracefully when Redis is unavailable', async () => {
    await seedTenantAndUser();

    await context.redis.disconnect();

    try {
      const response = await loginE2E(httpClient, {
        identifier: 'security@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
    } finally {
      await context.redis.connect();
    }
  });

  it('throttles repeated failed logins', async () => {
    await seedTenantAndUser();

    let lastResponse: Awaited<ReturnType<typeof loginE2E>> | undefined;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      lastResponse = await loginE2E(httpClient, {
        identifier: 'security@example.com',
        password: 'WrongPassword',
      });
    }

    expect(lastResponse).toBeDefined();
    if (!lastResponse) {
      throw new Error('Expected login response after repeated failed attempts');
    }

    expect(lastResponse.status).toBe(429);
  });

  it('continues to record audit events when notification delivery fails', async () => {
    const { user } = await seedTenantAndUser();
    const mailService = context.app.get(MailService);
    Reflect.set(mailService, 'provider', createFailingMailProvider());

    const response = await requestPasswordResetE2E(httpClient, 'security@example.com');

    expect(response.status).toBe(200);

    const failedEvents = await context.prisma.auditLog.findMany({
      where: {
        tenantId: user.tenantId,
        action: 'PASSWORD_RESET_EMAIL_FAILED',
      },
    });

    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0]?.metadata).toBeDefined();
  });
});
