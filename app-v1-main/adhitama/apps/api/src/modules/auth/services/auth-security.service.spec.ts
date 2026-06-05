import { HttpException } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
import { AuthSecurityService } from './auth-security.service';
import { RedisService } from '@infrastructure/redis';

const redisClient = {
  get: jest.fn<Promise<string | null>, [string]>(),
  incr: jest.fn<Promise<number>, [string]>(),
  expire: jest.fn<Promise<number>, [string, number]>(),
  del: jest.fn<Promise<number>, [string | string[]]>(),
  setex: jest.fn<Promise<'OK'>, [string, number, string]>(),
  rpush: jest.fn<Promise<number>, [string, string]>(),
  ltrim: jest.fn<Promise<'OK'>, [string, number, number]>(),
};

const mockRedisService = {
  isReady: jest.fn<boolean, []>(),
  getClient: jest.fn<ReturnType<RedisService['getClient']>, []>(() => redisClient as any),
};

describe('AuthSecurityService', () => {
  let service: AuthSecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.isReady.mockReturnValue(true);
    service = new AuthSecurityService(mockRedisService as unknown as RedisService);
  });

  it('blocks login attempts when a lockout key is already present', async () => {
    redisClient.get.mockResolvedValueOnce('1');
    redisClient.get.mockResolvedValueOnce(null);

    await expect(
      service.preflightLogin({
        identifier: 'user@example.com',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('records failed login attempts and escalates them to a lockout', async () => {
    redisClient.incr.mockResolvedValueOnce(5);
    redisClient.incr.mockResolvedValueOnce(5);

    await service.recordLoginFailure({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
      userAgent: 'jest',
    });

    expect(redisClient.setex).toHaveBeenCalledTimes(1);
    expect(redisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining('identifier'),
      900,
      '1',
    );
    expect(redisClient.rpush).toHaveBeenCalledWith(
      'auth:security:events',
      expect.stringContaining('auth.login.suspicious'),
    );
  });

  it('throws HttpException when identifier lock is active during login preflight', async () => {
    redisClient.get.mockResolvedValueOnce('1');
    redisClient.get.mockResolvedValueOnce(null);

    await expect(
      service.preflightLogin({
        identifier: 'lock@example.com',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('throws HttpException when ip lock is active during login preflight', async () => {
    redisClient.get.mockResolvedValueOnce(null);
    redisClient.get.mockResolvedValueOnce('1');

    await expect(
      service.preflightLogin({
        identifier: 'user@example.com',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('skips preflightLogin when Redis is unavailable', async () => {
    mockRedisService.isReady.mockReturnValue(false);

    await expect(
      service.preflightLogin({
        identifier: 'user@example.com',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).resolves.toBeUndefined();

    expect(redisClient.get).not.toHaveBeenCalled();
  });

  it('continues when preflightLogin encounters a non-HTTP error', async () => {
    redisClient.get.mockRejectedValueOnce(new Error('redis unavailable'));

    await expect(
      service.preflightLogin({
        identifier: 'user@example.com',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws HttpException when refresh is locked during preflightRefresh', async () => {
    redisClient.get.mockResolvedValueOnce('1');

    await expect(
      service.preflightRefresh({
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('skips recordLoginFailure when Redis is unavailable', async () => {
    mockRedisService.isReady.mockReturnValue(false);

    await service.recordLoginFailure({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
      userAgent: 'jest',
    });

    expect(redisClient.incr).not.toHaveBeenCalled();
    expect(redisClient.setex).not.toHaveBeenCalled();
  });

  it('records ip lock and suspicious event when IP failure threshold is reached', async () => {
    redisClient.incr.mockResolvedValueOnce(1);
    redisClient.incr.mockResolvedValueOnce(10);

    await service.recordLoginFailure({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
      userAgent: 'jest',
    });

    expect(redisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining('ip'),
      900,
      '1',
    );
    expect(redisClient.rpush).toHaveBeenCalledWith(
      'auth:security:events',
      expect.stringContaining('auth.login.suspicious'),
    );
  });

  it('skips recordLoginSuccess when Redis is unavailable', async () => {
    mockRedisService.isReady.mockReturnValue(false);

    await service.recordLoginSuccess({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
    });

    expect(redisClient.del).not.toHaveBeenCalled();
  });

  it('records refresh failure suspicious activity when the refresh threshold is met', async () => {
    redisClient.incr.mockResolvedValueOnce(10);

    await service.recordRefreshFailure({
      ipAddress: '10.0.0.20',
      userAgent: 'jest',
    });

    expect(redisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining('refresh'),
      900,
      '1',
    );
    expect(redisClient.rpush).toHaveBeenCalledWith(
      'auth:security:events',
      expect.stringContaining('auth.refresh.suspicious'),
    );
  });

  it('cleans up refresh counters after refresh success', async () => {
    await service.recordRefreshSuccess({
      ipAddress: '10.0.0.20',
      userAgent: 'jest',
    });

    expect(redisClient.del).toHaveBeenCalledWith(expect.any(String));
    expect(redisClient.del).toHaveBeenCalledTimes(2);
    expect(redisClient.rpush).toHaveBeenCalledWith(
      'auth:security:events',
      expect.stringContaining('auth.refresh.success'),
    );
  });

  it('continues when preflightRefresh encounters a non-HTTP error', async () => {
    redisClient.get.mockRejectedValueOnce(new Error('redis unavailable'));

    await expect(
      service.preflightRefresh({
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).resolves.toBeUndefined();
  });

  it('clears counters after a successful login', async () => {
    await service.recordLoginSuccess({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
    });

    expect(redisClient.del).toHaveBeenCalledTimes(4);
  });
});
