import { HttpException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis';

interface LoginSecurityInput {
  identifier: string;
  tenantId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface RefreshSecurityInput {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);

  private readonly loginFailureThreshold = 5;
  private readonly loginIpThreshold = 10;
  private readonly loginFailureWindowSeconds = 10 * 60;
  private readonly loginLockoutSeconds = 15 * 60;
  private readonly refreshFailureThreshold = 10;
  private readonly refreshFailureWindowSeconds = 10 * 60;
  private readonly refreshLockoutSeconds = 15 * 60;

  constructor(private readonly redisService: RedisService) {}

  async preflightLogin(input: LoginSecurityInput): Promise<void> {
    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const [identifierLock, ipLock] = await Promise.all([
        this.get(this.buildIdentifierLockKey(input)),
        this.get(this.buildIpLockKey(input)),
      ]);

      if (identifierLock || ipLock) {
        this.logger.warn(
          `Login throttled — tenantId=${input.tenantId}, identifier=${input.identifier}, ip=${input.ipAddress ?? 'unknown'}`,
        );
        throw new HttpException(
          'Authentication temporarily locked. Try again later.',
          429,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.debug(
        `Redis security preflight unavailable for login — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async recordLoginFailure(input: LoginSecurityInput): Promise<void> {
    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      const identifierKey = this.buildIdentifierFailureKey(input);
      const ipKey = this.buildIpFailureKey(input);
      const identifierLockKey = this.buildIdentifierLockKey(input);
      const ipLockKey = this.buildIpLockKey(input);

      const [identifierFailures, ipFailures] = await Promise.all([
        client.incr(identifierKey),
        client.incr(ipKey),
      ]);

      await Promise.all([
        this.setExpireOnFirst(client, identifierKey, this.loginFailureWindowSeconds, Number(identifierFailures)),
        this.setExpireOnFirst(client, ipKey, this.loginFailureWindowSeconds, Number(ipFailures)),
      ]);

      const shouldLockIdentifier = Number(identifierFailures) >= this.loginFailureThreshold;
      const shouldLockIp = Number(ipFailures) >= this.loginIpThreshold;

      if (shouldLockIdentifier) {
        await client.setex(identifierLockKey, this.loginLockoutSeconds, '1');
      }

      if (shouldLockIp) {
        await client.setex(ipLockKey, this.loginLockoutSeconds, '1');
      }

      if (shouldLockIdentifier || shouldLockIp) {
        await this.logSecurityEvent('auth.login.suspicious', {
          tenantId: input.tenantId,
          identifier: input.identifier,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          identifierFailures,
          ipFailures,
        });
      }
    } catch (error) {
      this.logger.debug(
        `Redis security logging unavailable for login failure — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async recordLoginSuccess(input: LoginSecurityInput): Promise<void> {
    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      const identifierKey = this.buildIdentifierFailureKey(input);
      const ipKey = this.buildIpFailureKey(input);
      const identifierLockKey = this.buildIdentifierLockKey(input);
      const ipLockKey = this.buildIpLockKey(input);

      await Promise.all([
        client.del(identifierKey),
        client.del(ipKey),
        client.del(identifierLockKey),
        client.del(ipLockKey),
      ]);

      await this.logSecurityEvent('auth.login.success', {
        tenantId: input.tenantId,
        identifier: input.identifier,
        ipAddress: input.ipAddress ?? null,
      });
    } catch (error) {
      this.logger.debug(
        `Redis security cleanup unavailable for login success — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async preflightRefresh(input: RefreshSecurityInput): Promise<void> {
    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const refreshLockKey = this.buildRefreshLockKey(input);
      const lockValue = await this.get(refreshLockKey);

      if (lockValue) {
        this.logger.warn(
          `Refresh throttled — ip=${input.ipAddress ?? 'unknown'}`,
        );
        throw new HttpException(
          'Authentication temporarily locked. Try again later.',
          429,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.debug(
        `Redis security preflight unavailable for refresh — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async recordRefreshFailure(input: RefreshSecurityInput): Promise<void> {
    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      const refreshFailuresKey = this.buildRefreshFailureKey(input);
      const refreshLockKey = this.buildRefreshLockKey(input);
      const refreshFailures = await client.incr(refreshFailuresKey);

      await this.setExpireOnFirst(
        client,
        refreshFailuresKey,
        this.refreshFailureWindowSeconds,
        Number(refreshFailures),
      );

      if (Number(refreshFailures) >= this.refreshFailureThreshold) {
        await client.setex(refreshLockKey, this.refreshLockoutSeconds, '1');
        await this.logSecurityEvent('auth.refresh.suspicious', {
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          refreshFailures,
        });
      }
    } catch (error) {
      this.logger.debug(
        `Redis security logging unavailable for refresh failure — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async recordRefreshSuccess(input: RefreshSecurityInput): Promise<void> {
    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      const refreshFailuresKey = this.buildRefreshFailureKey(input);
      const refreshLockKey = this.buildRefreshLockKey(input);

      await Promise.all([client.del(refreshFailuresKey), client.del(refreshLockKey)]);
      await this.logSecurityEvent('auth.refresh.success', {
        ipAddress: input.ipAddress ?? null,
      });
    } catch (error) {
      this.logger.debug(
        `Redis security cleanup unavailable for refresh success — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async get(key: string): Promise<string | null> {
    return this.redisService.getClient().get(key);
  }

  private async setExpireOnFirst(
    client: ReturnType<RedisService['getClient']>,
    key: string,
    ttl: number,
    count: number,
  ): Promise<void> {
    if (count === 1) {
      await client.expire(key, ttl);
    }
  }

  private buildIdentifierFailureKey(input: LoginSecurityInput): string {
    const normalizedIdentifier = input.identifier.trim().toLowerCase();
    return `auth:security:login:fail:identifier:${input.tenantId}:${normalizedIdentifier}`;
  }

  private buildIpFailureKey(input: LoginSecurityInput): string {
    const normalizedIp = input.ipAddress?.trim() ?? 'unknown';
    return `auth:security:login:fail:ip:${input.tenantId}:${normalizedIp}`;
  }

  private buildIdentifierLockKey(input: LoginSecurityInput): string {
    const normalizedIdentifier = input.identifier.trim().toLowerCase();
    return `auth:security:login:lock:identifier:${input.tenantId}:${normalizedIdentifier}`;
  }

  private buildIpLockKey(input: LoginSecurityInput): string {
    const normalizedIp = input.ipAddress?.trim() ?? 'unknown';
    return `auth:security:login:lock:ip:${input.tenantId}:${normalizedIp}`;
  }

  private buildRefreshFailureKey(input: RefreshSecurityInput): string {
    const normalizedIp = input.ipAddress?.trim() ?? 'unknown';
    return `auth:security:refresh:fail:ip:${normalizedIp}`;
  }

  private buildRefreshLockKey(input: RefreshSecurityInput): string {
    const normalizedIp = input.ipAddress?.trim() ?? 'unknown';
    return `auth:security:refresh:lock:ip:${normalizedIp}`;
  }

  private async logSecurityEvent(
    event: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    };

    this.logger.warn(JSON.stringify(payload));

    if (!this.redisService.isReady()) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      await client.rpush('auth:security:events', JSON.stringify(payload));
      await client.ltrim('auth:security:events', -200, -1);
    } catch {
      // Redis-backed event storage is best-effort; structured logs remain intact.
    }
  }
}
