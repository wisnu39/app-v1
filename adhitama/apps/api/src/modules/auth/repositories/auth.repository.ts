import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import type {
  UserForAuth,
  UserProfileForAuth,
} from '../types/auth-repository.types';

/**
 * AuthRepository — database access for authentication user lookups.
 *
 * Responsibilities:
 *   - Find users by email for login
 *   - Find users by NIP for employee login
 *
 * Rules:
 *   - Always filters deletedAt: null — soft-deleted users are invisible here
 *   - Does NOT filter by status — status validation is AuthService's responsibility
 *   - Returns typed UserForAuth shape — NOT raw Prisma User entity
 *   - Selects ONLY fields needed by auth consumers — no over-fetching
 *   - No business logic, no hashing, no JWT, no validation rules
 *
 * Query select discipline (fields included and why):
 *   id              — for session creation and token payload
 *   tenantId        — for tenant-scoped operations and token payload
 *   roleId          — for RBAC and token payload
 *   email           — for identity confirmation in response
 *   nip             — for identity confirmation in response
 *   passwordHash    — for PasswordService.verify() in AuthService
 *   status          — for AuthService to validate ACTIVE state
 *   deletedAt       — for AuthService safety check (already filtered, extra safety)
 *   mustChangePassword — for AuthService to set flag in login response
 *   emailVerifiedAt    — for AuthService / future gate awareness
 *
 * Fields explicitly NOT selected:
 *   name, address, contact, avatarUrl — presentation data
 *   lastLoginAt    — updated after login, not needed for lookup
 *   createdAt, updatedAt — not needed in auth flow
 *   All relations  — never fetched in auth context
 *
 * Identifier detection discipline:
 *   findByEmail() and findByNip() are SEPARATE methods.
 *   Which method to call is determined by AuthService — not this repository.
 *   This makes each query explicit, testable, and auditable independently.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Find a user by email address within a specific tenant.
   *
   * Always filters out soft-deleted users (deletedAt: null).
   * Does NOT filter by status — caller is responsible for status check.
   *
   * @param email    - Email address to search for (case-sensitive)
   * @param tenantId - Tenant scope — prevents cross-tenant lookup
   * @returns UserForAuth if found, null if not found or soft-deleted
   */
  async findByEmail(
    email: string,
    tenantId: string,
  ): Promise<UserForAuth | null> {
    const user = await this.prismaService.user.findFirst({
      where: {
        email,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        roleId: true,
        email: true,
        nip: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
        mustChangePassword: true,
        emailVerifiedAt: true,
      },
    });

    return user;
  }

  /**
   * Find a user by NIP (Nomor Induk Pegawai) within a specific tenant.
   *
   * Used for employee login flow — employees may login via NIP or email.
   * Owner accounts typically do not have a NIP and cannot use this path.
   *
   * Always filters out soft-deleted users (deletedAt: null).
   * Does NOT filter by status — caller is responsible for status check.
   *
   * NIP uniqueness is per-tenant (@@unique([tenantId, nip]) in schema).
   * findFirst is safe here but findUnique cannot be used because
   * nip is nullable and null NIPs are excluded by the deletedAt filter.
   *
   * @param nip      - NIP to search for
   * @param tenantId - Tenant scope — prevents cross-tenant lookup
   * @returns UserForAuth if found, null if not found, NIP null, or soft-deleted
   */
  async findByNip(
    nip: string,
    tenantId: string,
  ): Promise<UserForAuth | null> {
    const user = await this.prismaService.user.findFirst({
      where: {
        nip,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        roleId: true,
        email: true,
        nip: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
        mustChangePassword: true,
        emailVerifiedAt: true,
      },
    });

    return user;
  }

  async updateLastLogin(userId: string, tenantId: string): Promise<number> {
    const result = await this.prismaService.user.updateMany({
      where: { id: userId, tenantId },
      data: { lastLoginAt: new Date() },
    });

    return result.count;
  }

  async findProfileById(
    userId: string,
    tenantId: string,
  ): Promise<UserProfileForAuth | null> {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        roleId: true,
        name: true,
        email: true,
        nip: true,
        emailVerifiedAt: true,
        mustChangePassword: true,
        avatarUrl: true,
        contact: true,
        address: true,
      },
    });

    return user;
  }

  async markEmailVerified(userId: string, tenantId: string): Promise<boolean> {
    const result = await this.prismaService.user.updateMany({
      where: { id: userId, tenantId, deletedAt: null },
      data: { emailVerifiedAt: new Date() },
    });

    return result.count === 1;
  }
}
