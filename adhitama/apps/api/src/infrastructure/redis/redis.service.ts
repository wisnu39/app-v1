import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisConfig } from '@config/index';

/**
 * RedisService — ioredis client wrapper for NestJS DI.
 *
 * Responsibilities:
 *   - Provide a singleton Redis client instance via NestJS DI
 *   - Manage connection lifecycle (connect on init, disconnect on destroy)
 *   - Expose ping() for health checking
 *
 * Connection Strategy: LAZY + NON-FATAL
 *   - lazyConnect: true  → ioredis does not auto-connect on instantiation
 *   - onModuleInit explicitly calls connect()
 *   - If Redis is unavailable at startup: logs a WARNING, does NOT throw
 *   - App bootstrap continues normally — Redis is a non-critical dependency
 *     at this phase (cache, session, blacklist are degraded, not broken)
 *
 * Retry Strategy:
 *   - ioredis built-in reconnect is enabled with a capped backoff
 *   - maxRetriesPerRequest: 2 → commands fail fast instead of hanging
 *   - retryStrategy: exponential backoff, capped at 5s, max 10 attempts
 *
 * Rules (CODING_STANDARDS.md & ARCHITECTURE.md):
 *   - Only RedisService may instantiate the Redis client
 *   - CacheModule, AuthModule, SessionModule inject RedisService via DI
 *   - DO NOT use RedisService directly in business modules
 *   - DO NOT add cache/lock/queue logic here — single responsibility
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  /**
   * The ioredis client instance.
   * Initialized in constructor, connected in onModuleInit.
   * Accessible to consumers (CacheModule, SessionModule) via getClient().
   */
  private readonly client: Redis;

  /**
   * Tracks whether the initial connect attempt has completed.
   * Used to suppress redundant "reconnecting" logs during expected retries.
   */
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<RedisConfig>('redis');

    if (!config) {
      throw new Error('Redis configuration not found. Ensure ConfigModule is loaded first.');
    }

    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,

      // ─── Lazy Connection ─────────────────────────────────
      // Do not auto-connect. onModuleInit will call connect() explicitly.
      // This gives us control over error handling at startup.
      lazyConnect: true,

      // ─── Timeouts ────────────────────────────────────────
      // How long to wait for initial connection (ms)
      connectTimeout: 5000,

      // ─── Retry Strategy ──────────────────────────────────
      // Called by ioredis on each reconnect attempt.
      // Return: delay in ms before next attempt, or null to stop retrying.
      retryStrategy: (attempts: number): number | null => {
        const MAX_ATTEMPTS = 10;

        if (attempts >= MAX_ATTEMPTS) {
          this.logger.warn(
            `Redis retry limit reached (${MAX_ATTEMPTS} attempts). ` +
              'Redis-dependent features will be unavailable until reconnected.',
          );
          return null; // Stop retrying — ioredis enters "stopped" state
        }

        // Exponential backoff: 100ms → 200ms → 400ms → ... capped at 5s
        const delay = Math.min(100 * Math.pow(2, attempts - 1), 5000);
        this.logger.debug(`Redis reconnect attempt ${attempts}, next retry in ${delay}ms`);
        return delay;
      },

      // ─── Request-level Retry ─────────────────────────────
      // Max retries per individual command before throwing.
      // Prevents commands from hanging indefinitely when Redis is flaky.
      maxRetriesPerRequest: 2,

      // ─── Enable Offline Queue ─────────────────────────────
      // Commands sent while disconnected are queued and flushed on reconnect.
      // Set to false for stricter fail-fast behavior on individual commands.
      enableOfflineQueue: true,
    });

    // ─── Connection Event Listeners ──────────────────────
    this.registerEventListeners();
  }

  /**
   * Attempt to connect to Redis when the NestJS module initializes.
   *
   * NON-FATAL strategy:
   *   - On success: logs confirmation, sets isConnected = true
   *   - On failure: logs a warning, allows app to continue
   *   - ioredis will continue retrying in the background (retryStrategy)
   */
  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  /**
   * Disconnect cleanly when the NestJS module is destroyed.
   * Called automatically on SIGTERM / SIGINT via enableShutdownHooks().
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Returns the raw ioredis client.
   * Used by CacheModule, SessionModule, AuthModule (token blacklist).
   *
   * Callers should handle the case where Redis is not connected.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Checks if the Redis connection is currently active.
   * Use this before performing Redis operations in health checks.
   */
  isReady(): boolean {
    return this.client.status === 'ready';
  }

  /**
   * Sends a PING command to Redis and returns true if Redis responds.
   * Returns false on any error — does not throw.
   *
   * Used by:
   *   - HealthModule (Task 2.2.5) for /health endpoint
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  // ─── Private Methods ─────────────────────────────────────────

  /**
   * Attempt connection. Non-fatal — logs warning on failure.
   */
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.log(
        `Redis connection established (${this.configService.get<RedisConfig>('redis')?.host}:` +
          `${this.configService.get<RedisConfig>('redis')?.port})`,
      );
    } catch (error: unknown) {
      // Log as WARN, not ERROR — Redis unavailability is non-fatal
      this.logger.warn(
        'Redis connection failed at startup. ' +
          'Redis-dependent features (cache, session, token blacklist) will be degraded. ' +
          `Reason: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Do NOT rethrow — app continues without Redis
    }
  }

  /**
   * Gracefully disconnect ioredis.
   * Uses quit() for a clean disconnect (waits for pending commands).
   * Falls back to disconnect() if quit times out.
   */
  private async disconnect(): Promise<void> {
    if (this.client.status === 'end' || this.client.status === 'close') {
      return; // Already disconnected
    }

    try {
      // quit() sends QUIT command — waits for Redis to acknowledge
      await this.client.quit();
      this.logger.log('Redis connection closed');
    } catch (error: unknown) {
      // Force disconnect if quit fails
      this.client.disconnect();
      this.logger.warn(
        `Redis quit failed, forced disconnect. ` +
          `Reason: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register ioredis event listeners for structured connection logging.
   * Called once in constructor — listeners are bound to the client lifetime.
   */
  private registerEventListeners(): void {
    this.client.on('connect', () => {
      this.logger.debug('Redis: TCP connection established');
    });

    this.client.on('ready', () => {
      if (!this.isConnected) {
        // Suppress during onModuleInit — already logged in connect()
        return;
      }
      this.logger.log('Redis: connection restored');
    });

    this.client.on('error', (error: Error) => {
      // Log connection errors without crashing
      // ioredis emits 'error' on every failed attempt — keep it as debug
      // to avoid log flooding during retry storms
      this.logger.debug(`Redis error: ${error.message}`);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        this.logger.warn('Redis: connection closed unexpectedly');
        this.isConnected = false;
      }
    });

    this.client.on('reconnecting', (delay: number) => {
      this.logger.debug(`Redis: reconnecting in ${delay}ms`);
    });

    this.client.on('end', () => {
      this.logger.debug('Redis: connection ended (no more retries)');
    });
  }
}
