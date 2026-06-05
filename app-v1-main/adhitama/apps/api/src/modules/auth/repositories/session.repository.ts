import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import type {
  CreateSessionInput,
  SessionForRevocation,
  SessionRecord,
  SessionWithHash,
} from '../types/session-repository.types';

/**
 * SessionRepository — database access for session management.
 *
 * Responsibilities:
 *   - Create new sessions on login or refresh token rotation
 *   - Find sessions for validation (by ID or refresh token hash)
 *   - Revoke single session (logout current device)
 *   - Revoke all user sessions (logout-all or admin action)
 *
 * Refresh token security discipline:
 *   - This repository ONLY stores refreshTokenHash — never raw tokens
 *   - findByHash() receives a hash and does a direct lookup
 *   - Caller (SessionService) is responsible for hashing before calling create()
 *   - Caller is responsible for hashing before calling findByHash()
 *
 * Revocation scope discipline:
 *   - revoke()    : by sessionId + userId (prevents cross-user revocation)
 *   - revokeAll() : by userId + tenantId (scoped, no accidental global revoke)
 *
 * Rules:
 *   - No business logic — no password, no JWT, no auth orchestration
 *   - No cleanup jobs, analytics, pagination, or device grouping
 *   - No transactions — caller (SessionService) handles transaction scope
 *   - Returns typed shapes — NOT raw Prisma Session entity
 */
@Injectable()
export class SessionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create a new session row.
   *
   * Called by SessionService after successful login or refresh token rotation.
   * refreshTokenHash must already be hashed by the caller — never raw token.
   *
   * @param input - CreateSessionInput with hashed token and metadata
   * @returns SessionRecord of the newly created session
   */
  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const session = await this.prismaService.session.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        tenantId: input.tenantId,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        deviceInfo: input.deviceInfo ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return session;
  }

  /**
   * Find a session by its ID, scoped to a specific user.
   *
   * Used by JwtStrategy indirectly (strategy queries PrismaService directly
   * for performance — avoids extra DI hop in hot path).
   * Used by SessionService to validate before revocation.
   *
   * @param sessionId - Session row ID
   * @param userId    - User scope — prevents cross-user session access
   * @returns SessionRecord if found, null otherwise
   */
  async findById(
    sessionId: string,
    userId: string,
    tenantId: string,
  ): Promise<SessionRecord | null> {
    const session = await this.prismaService.session.findFirst({
      where: {
        id: sessionId,
        userId,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return session;
  }

  /**
   * Find a session by refresh token hash.
   *
   * Used during refresh token rotation to locate the session being refreshed.
   * Caller must hash the raw refresh token before passing here.
   *
   * Scoped by userId to prevent hash collision cross-user scenarios.
   *
   * @param refreshTokenHash - Argon2id hash of the refresh token
   * @param userId           - User scope
   * @returns SessionRecord if found (active or revoked), null if not found
   */
  async findByHash(
    refreshTokenHash: string,
    userId: string,
  ): Promise<SessionRecord | null> {
    const session = await this.prismaService.session.findFirst({
      where: {
        refreshTokenHash,
        userId,
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return session;
  }

  /**
   * Find a session by ID and user scope, including the stored refresh token hash.
   *
   * Used by SessionService to verify token ownership before rotating refresh tokens.
   * @param sessionId - Session row ID
   * @param userId    - User scope
   */
  async findSessionById(
    sessionId: string,
    userId: string,
    tenantId: string,
  ): Promise<SessionWithHash | null> {
    const session = await this.prismaService.session.findFirst({
      where: {
        id: sessionId,
        userId,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        refreshTokenHash: true,
      },
    });

    return session;
  }

  /**
   * Find an active session by ID and user scope, including the stored refresh token hash.
   *
   * Used to validate refresh token ownership and prevent stale/replayed refresh requests.
   * @param sessionId - Session row ID
   * @param userId    - User scope
   */
  async findActiveSessionById(
    sessionId: string,
    userId: string,
    tenantId: string,
  ): Promise<SessionWithHash | null> {
    const session = await this.prismaService.session.findFirst({
      where: {
        id: sessionId,
        userId,
        tenantId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        refreshTokenHash: true,
      },
    });

    return session;
  }

  /**
   * Revoke an existing active session and create a rotated replacement atomically.
   *
   * This is the core refresh token rotation guard. It ensures that the old
   * session is revoked and the new session is created in a single transaction.
   * If the old session is already revoked, the rotation fails safely.
   *
   * @param sessionId     - Existing session being rotated
   * @param userId        - User scope
   * @param tenantId      - Tenant scope
   * @param newSession    - New session payload, including hashed refresh token
   * @returns Created SessionRecord or null when rotation could not proceed
   */
  async revokeSessionChain(
    sessionId: string,
    userId: string,
    tenantId: string,
    newSession: CreateSessionInput,
  ): Promise<SessionRecord | null> {
    const rotatedSession = await this.prismaService.$transaction(
      async (tx) => {
        const revoked = await tx.session.updateMany({
          where: {
            id: sessionId,
            userId,
            tenantId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        if (revoked.count !== 1) {
          return null;
        }

        return tx.session.create({
          data: {
            ...(newSession.id ? { id: newSession.id } : {}),
            tenantId: newSession.tenantId,
            userId: newSession.userId,
            refreshTokenHash: newSession.refreshTokenHash,
            expiresAt: newSession.expiresAt,
            deviceInfo: newSession.deviceInfo ?? null,
            ipAddress: newSession.ipAddress ?? null,
            userAgent: newSession.userAgent ?? null,
          },
          select: {
            id: true,
            tenantId: true,
            userId: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },
        });
      },
    );

    return rotatedSession;
  }

  /**
   * Revoke a single session by ID.
   *
   * Sets revokedAt to now(). Scoped by userId to prevent cross-user revocation.
   * Called on: single-device logout, admin revocation of specific session.
   *
   * Does NOT throw if session is already revoked — idempotent update.
   *
   * @param sessionId - Session to revoke
   * @param userId    - User scope — prevents cross-user revocation
   * @returns SessionForRevocation with id and revokedAt timestamp
   */
  async revoke(
    sessionId: string,
    userId: string,
    tenantId: string,
  ): Promise<SessionForRevocation> {
    const session = await this.prismaService.session.updateMany({
      where: {
        id: sessionId,
        userId,
        tenantId,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (session.count !== 1) {
      return { id: sessionId, revokedAt: new Date() };
    }

    return { id: sessionId, revokedAt: new Date() };
  }

  /**
   * Revoke ALL active sessions for a user within a tenant.
   *
   * Scoped by both userId AND tenantId — prevents accidental cross-tenant impact.
   * Called on: logout-all, admin suspension, password change (invalidate all sessions).
   *
   * Updates all non-revoked sessions atomically via updateMany.
   *
   * @param userId   - User whose sessions to revoke
   * @param tenantId - Tenant scope — safety boundary
   * @returns Number of sessions revoked
   */
  async revokeAll(userId: string, tenantId: string): Promise<number> {
    const result = await this.prismaService.session.updateMany({
      where: {
        userId,
        tenantId,
        // Only revoke sessions not already revoked
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }
}
