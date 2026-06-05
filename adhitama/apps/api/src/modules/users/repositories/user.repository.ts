import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import type { UserRecord, UserListQuery } from '../types/user.types';

// Repository layer only.
// No business logic allowed here.

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

/**
 * CreateUserData — input shape for user.repository.create().
 *
 * passwordHash is accepted here — this is the ONE place where hashed
 * credentials enter the DB. UserService is responsible for hashing
 * before calling create().
 */
export interface CreateUserData {
  tenantId: string;
  roleId: string;
  name: string;
  email: string;
  passwordHash: string;
  nip?: string | null;
  status?: UserStatus;
  mustChangePassword?: boolean;
  address?: string | null;
  contact?: string | null;
  avatarUrl?: string | null;
}

/**
 * UpdateUserData — partial update shape for user.repository.update().
 * passwordHash excluded — password change is a dedicated flow.
 */
export interface UpdateUserData {
  name?: string;
  roleId?: string;
  nip?: string | null;
  address?: string | null;
  contact?: string | null;
  avatarUrl?: string | null;
}

/**
 * VALID_SORT_FIELDS — whitelist for sortBy parameter.
 * Any value outside this set falls back to 'createdAt'.
 */
const VALID_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'nip',
  'status',
] as const);

type ValidSortField = 'createdAt' | 'updatedAt' | 'name' | 'email' | 'nip' | 'status';

/**
 * UserRepository — database access layer for user management.
 *
 * Responsibilities:
 *   - Query users with tenant isolation and soft-delete filtering
 *   - Paginated list with search and sort
 *   - Create, update, status update, soft delete
 *   - count() for pagination metadata
 *
 * Rules (enforced in every method):
 *   - All queries scoped to tenantId
 *   - All default queries filter deletedAt: null
 *   - passwordHash NEVER selected in default select (see userSelect)
 *   - No business rules, no NIP generation, no password hashing
 *   - Returns typed UserRecord shapes — not raw Prisma entities
 *
 * Pagination defaults:
 *   page    : 1
 *   limit   : 10
 *   maxLimit: 100
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Reusable select object — applied to all user queries.
   *
   * passwordHash is intentionally excluded.
   * Auth-related lookups (login) use AuthRepository which has its own select.
   */
  private readonly userSelect = {
    id: true,
    tenantId: true,
    roleId: true,
    name: true,
    email: true,
    nip: true,
    status: true,
    avatarUrl: true,
    contact: true,
    address: true,
    mustChangePassword: true,
    emailVerifiedAt: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  // ─── Read Operations ───────────────────────────────────────

  /**
   * findAll() — paginated, searchable, sortable user list.
   *
   * @param query.tenantId  - Required scope
   * @param query.page      - 1-based page number (default: 1)
   * @param query.limit     - Page size (default: 10, max: 100)
   * @param query.search    - Searched against name, email, nip (case-insensitive)
   * @param query.sortBy    - Whitelisted field (falls back to createdAt)
   * @param query.sortOrder - 'asc' | 'desc' (default: 'desc')
   */
  async findAll(
    tenantId: string,
    query: UserListQuery,
  ): Promise<{ data: UserRecord[]; meta: { page: number; limit: number; totalItems: number; totalPages: number } }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    const sortBy = this.resolveSortField(query.sortBy);
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // ── Where clause ─────────────────────────────────────────
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name:  { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { nip:   { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    // ── Parallel query: data + count ──────────────────────────
    const [users, totalItems] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        select: this.userSelect,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.toUserRecord(user)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  /**
   * findById() — find one active user by ID within a tenant.
   * Returns null if not found or soft-deleted.
   */
  async findById(
    id: string,
    tenantId: string,
  ): Promise<UserRecord | null> {
    const user = await this.prismaService.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: this.userSelect,
    });

    return user ? this.toUserRecord(user) : null;
  }

  /**
   * findByEmail() — find active user by email within a tenant.
   * Returns null if not found, not found in tenant, or soft-deleted.
   */
  async findByEmail(
    email: string,
    tenantId: string,
  ): Promise<UserRecord | null> {
    const user = await this.prismaService.user.findFirst({
      where: { email, tenantId, deletedAt: null },
      select: this.userSelect,
    });

    return user ? this.toUserRecord(user) : null;
  }

  /**
   * findByNip() — find active user by NIP within a tenant.
   * NIP is per-tenant unique but nullable.
   * Returns null if not found, NIP null, or soft-deleted.
   */
  async findByNip(
    nip: string,
    tenantId: string,
  ): Promise<UserRecord | null> {
    const user = await this.prismaService.user.findFirst({
      where: { nip, tenantId, deletedAt: null },
      select: this.userSelect,
    });

    return user ? this.toUserRecord(user) : null;
  }

  async findRoleById(
    roleId: string,
    tenantId: string,
  ): Promise<{ id: string; name: string } | null> {
    const role = await this.prismaService.role.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true, name: true },
    });

    return role;
  }

  async countActiveUsersByRoleName(
    roleName: string,
    tenantId: string,
  ): Promise<number> {
    return this.prismaService.user.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'ACTIVE',
        role: { name: roleName },
      },
    });
  }

  /**
   * findByIdIncludingDeleted() — find user by ID regardless of soft-delete state.
   *
   * Used by:
   *   - Admin restore operations (future)
   *   - Audit investigations
   *   - Service-level checks that need to distinguish "never existed" from "deleted"
   *
   * Returns null only if user does not exist in the tenant at all.
   */
  async findByIdIncludingDeleted(
    id: string,
    tenantId: string,
  ): Promise<UserRecord | null> {
    const user = await this.prismaService.user.findFirst({
      where: { id, tenantId },
      select: {
        ...this.userSelect,
        deletedAt: true,
      },
    });

    return user ? this.toUserRecord(user) : null;
  }

  /**
   * count() — count active users in a tenant.
   * Used for pagination metadata when needed independently.
   */
  async count(tenantId: string): Promise<number> {
    return this.prismaService.user.count({
      where: { tenantId, deletedAt: null },
    });
  }

  // ─── Write Operations ──────────────────────────────────────

  /**
   * create() — insert a new user row.
   *
   * Caller (UserService) is responsible for:
   *   - Hashing the password before passing passwordHash
   *   - Generating NIP via NipHelper if required
   *   - Setting mustChangePassword = true for new users
   *
   * @returns UserRecord of the created user (no passwordHash)
   */
  async create(data: CreateUserData): Promise<UserRecord> {
    const user = await this.prismaService.user.create({
      data: {
        tenantId: data.tenantId,
        roleId: data.roleId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        nip: data.nip ?? null,
        status: data.status ?? 'ACTIVE',
        mustChangePassword: data.mustChangePassword ?? true,
        address: data.address ?? null,
        contact: data.contact ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
      select: this.userSelect,
    });

    return this.toUserRecord(user);
  }

  /**
   * update() — partial update of user profile fields.
   *
   * Excludes passwordHash — password change is a dedicated flow.
   * Scoped by id + tenantId to prevent cross-tenant mutation.
   *
   * @returns Updated UserRecord, or null if not found / not in tenant
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateUserData,
  ): Promise<UserRecord | null> {
    const result = await this.prismaService.user.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: {
        ...(data.name !== undefined     ? { name: data.name }         : {}),
        ...(data.roleId !== undefined   ? { roleId: data.roleId }     : {}),
        ...(data.nip !== undefined      ? { nip: data.nip }           : {}),
        ...(data.address !== undefined  ? { address: data.address }   : {}),
        ...(data.contact !== undefined  ? { contact: data.contact }   : {}),
        ...(data.avatarUrl !== undefined? { avatarUrl: data.avatarUrl }: {}),
      },
    });

    if (result.count !== 1) return null;

    const user = await this.findById(id, tenantId);
    return user;
  }

  /**
   * updateStatus() — update only the status field.
   *
   * Only modifies status + updatedAt (Prisma handles updatedAt).
   * Scoped by id + tenantId.
   *
   * @param status - One of: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
   * @returns Updated UserRecord, or null if not found / not in tenant
   */
  async updateStatus(
    id: string,
    tenantId: string,
    status: UserStatus,
  ): Promise<UserRecord | null> {
    const result = await this.prismaService.user.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status },
    });

    if (result.count !== 1) return null;

    const user = await this.findById(id, tenantId);
    return user;
  }

  /**
   * softDelete() — set deletedAt to current timestamp.
   *
   * Does NOT hard-delete the row.
   * Does NOT cascade session revocation — UserService handles that.
   * Scoped by id + tenantId to prevent cross-tenant mutation.
   *
   * TODO: future — trigger session revocation cascade via SessionService
   *       when a user is soft-deleted (active sessions should be invalidated).
   *
   * @returns true if user was found and deleted, false if not found
   */
  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.prismaService.user.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return result.count === 1;
  }

  // ─── Private Helpers ─────────────────────────────────────

  /**
   * resolveSortField() — validate and return whitelisted sort field.
   * Falls back to 'createdAt' for any invalid or missing input.
   */
  private resolveSortField(sortBy?: string): ValidSortField {
    if (sortBy && VALID_SORT_FIELDS.has(sortBy as ValidSortField)) {
      return sortBy as ValidSortField;
    }
    return 'createdAt';
  }

  /**
   * toUserRecord() — map Prisma query result to typed UserRecord.
   *
   * Ensures passwordHash is never included in the returned shape.
   * deletedAt is intentionally excluded from UserRecord (internal concern).
   */
  private toUserRecord(user: {
    id: string;
    tenantId: string;
    roleId: string;
    name: string;
    email: string;
    nip: string | null;
    status: string;
    avatarUrl: string | null;
    contact: string | null;
    address: string | null;
    mustChangePassword: boolean;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  }): UserRecord {
    return {
      id: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      nip: user.nip,
      status: user.status,
      avatarUrl: user.avatarUrl,
      contact: user.contact,
      address: user.address,
      mustChangePassword: user.mustChangePassword,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
