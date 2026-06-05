import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import type {
  CreateRoleData,
  UpdateRoleData,
  RoleRecord,
  RoleWithPermissions,
  PermissionRecord,
} from './rbac.repository.types';

// Repository layer only.
// No business logic allowed here.

/**
 * RbacRepository — database access layer for Role and Permission management.
 *
 * Tenant isolation rules:
 *   - ALL role queries are scoped by tenantId
 *   - Permission queries are GLOBAL (Permission table has no tenantId)
 *   - RolePermission joins are indirectly tenant-scoped via roleId
 *
 * Select discipline:
 *   - roleSelect: reusable flat role fields (no permissions)
 *   - permissionSelect: reusable permission fields
 *   - Full permissions loaded only where explicitly needed (findRoleById, assignPermissions)
 *
 * No business rules enforced here:
 *   - System role protection → RbacService
 *   - Role deletion safety → RbacService
 *   - Duplicate name messaging → RbacService
 *   - Permission existence validation → RbacService
 */
@Injectable()
export class RbacRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Reusable select for flat role fields — no permissions, no user count.
   * Used in findAllRoles() and wherever permission list is not needed.
   */
  private readonly roleSelect = {
    id: true,
    tenantId: true,
    name: true,
    description: true,
    createdById: true,
    updatedById: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  /**
   * Reusable select for permission fields.
   * Shared between findAllPermissions() and nested permission queries.
   */
  private readonly permissionSelect = {
    id: true,
    key: true,
    description: true,
    module: true,
  } as const;

  // ─── Role Read Operations ──────────────────────────────────

  /**
   * findAllRoles() — list all roles for a tenant, ordered by name.
   * Returns flat role records without permissions (use findRoleById for detail).
   */
  async findAllRoles(tenantId: string): Promise<RoleRecord[]> {
    const roles = await this.prismaService.role.findMany({
      where: { tenantId },
      select: this.roleSelect,
      orderBy: { name: 'asc' },
    });

    return roles;
  }

  /**
   * findRoleById() — find a role with its full permission list.
   *
   * Returns RoleWithPermissions including:
   *   - flat role fields
   *   - permissions[] from RolePermission join
   *   - userCount: count of non-deleted users assigned to this role
   *
   * tenantId is required — prevents cross-tenant role access.
   * Returns null if role not found or not in tenant.
   */
  async findRoleById(
    id: string,
    tenantId: string,
  ): Promise<RoleWithPermissions | null> {
    const role = await this.prismaService.role.findFirst({
      where: { id, tenantId },
      select: {
        ...this.roleSelect,
        rolePermissions: {
          select: {
            permission: {
              select: this.permissionSelect,
            },
          },
        },
      },
    });

    if (!role) return null;

    const userCount = await this.countUsersByRole(id, tenantId);

    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      description: role.description,
      createdById: role.createdById,
      updatedById: role.updatedById,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      userCount,
    };
  }

  /**
   * findRoleByName() — find a role by name within a tenant.
   *
   * Case-sensitive — matches database collation.
   * No toLowerCase normalization here; service layer decides on casing strategy.
   * Returns null if not found.
   */
  async findRoleByName(
    name: string,
    tenantId: string,
  ): Promise<RoleRecord | null> {
    const role = await this.prismaService.role.findFirst({
      where: { name, tenantId },
      select: this.roleSelect,
    });

    return role ?? null;
  }

  // ─── Role Write Operations ─────────────────────────────────

  /**
   * createRole() — insert a new role row for a tenant.
   * Returns the created RoleRecord (no permissions — freshly created role has none).
   */
  async createRole(data: CreateRoleData): Promise<RoleRecord> {
    const role = await this.prismaService.role.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        createdById: data.createdById ?? null,
        updatedById: data.createdById ?? null,
      },
      select: this.roleSelect,
    });

    return role;
  }

  /**
   * updateRole() — partial update of role fields.
   *
   * Scoped by id + tenantId to prevent cross-tenant mutation.
   * Returns updated RoleRecord, or null if not found in tenant.
   */
  async updateRole(
    id: string,
    tenantId: string,
    data: UpdateRoleData,
  ): Promise<RoleRecord | null> {
    const result = await this.prismaService.role.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name        !== undefined ? { name: data.name }               : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.updatedById !== undefined ? { updatedById: data.updatedById } : {}),
      },
    });

    if (result.count !== 1) return null;

    const role = await this.prismaService.role.findFirst({
      where: { id, tenantId },
      select: this.roleSelect,
    });

    return role ?? null;
  }

  /**
   * deleteRole() — delete a role row.
   *
   * Scoped by id + tenantId to prevent cross-tenant deletion.
   * Returns true if deleted, false if not found in tenant or if users remain.
   *
   * The role and user-count checks execute inside a single transaction so
   * concurrent reassignments cannot invalidate the safety check.
   */
  async deleteRole(id: string, tenantId: string): Promise<boolean> {
    const result = await this.prismaService.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });

      if (!role) return 0;

      const userCount = await tx.user.count({
        where: { roleId: id, tenantId, deletedAt: null },
      });

      if (userCount > 0) return 0;

      await tx.role.delete({
        where: { id },
      });

      return 1;
    });

    return result === 1;
  }

  // ─── Permission Operations ─────────────────────────────────

  /**
   * findAllPermissions() — list ALL system permissions (global, no tenantId).
   *
   * Permissions are system-level seeds — not tenant-specific.
   * Ordered by module then key for consistent display.
   */
  async findAllPermissions(): Promise<PermissionRecord[]> {
    const permissions = await this.prismaService.permission.findMany({
      select: this.permissionSelect,
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });

    return permissions;
  }
  async countPermissionsByIds(permissionIds: string[]): Promise<number> {
    if (permissionIds.length === 0) return 0;

    return this.prismaService.permission.count({
      where: { id: { in: permissionIds } },
    });
  }

  async permissionExists(permissionId: string): Promise<boolean> {
    const count = await this.prismaService.permission.count({
      where: { id: permissionId },
    });

    return count > 0;
  }
  // ─── RolePermission Operations ─────────────────────────────

  /**
   * assignPermissions() — bulk assign permissions to a role.
   *
   * Uses createMany with skipDuplicates: true — idempotent and safe.
   * No loop inserts — single atomic operation.
   *
   * Does NOT validate permission existence — caller (RbacService) validates first.
   *
   * Returns count of newly created RolePermission rows.
   * Returns 0 if all permissions were already assigned.
   */
  async assignPermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<number> {
    if (permissionIds.length === 0) return 0;

    const result = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });

      return created.count;
    });

    return result;
  }

  /**
   * removePermission() — remove a single permission from a role.
   *
   * Uses deleteMany — idempotent.
   * Does NOT throw if the relation does not exist.
   *
   * Returns count of deleted rows (0 or 1).
   */
  async removePermission(
    roleId: string,
    permissionId: string,
  ): Promise<number> {
    const result = await this.prismaService.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });

    return result.count;
  }

  // ─── Count Operations ──────────────────────────────────────

  /**
   * countUsersByRole() — count non-deleted users assigned to a role.
   *
   * Tenant-scoped via tenantId.
   * Excludes soft-deleted users (deletedAt: null).
   * Does NOT exclude SUSPENDED users — that is a business decision
   * for the service layer, not the repository.
   *
   * Used by:
   *   - findRoleById() for userCount in RoleWithPermissions
   *   - RbacService to guard role deletion (≥1 user assigned → block delete)
   */
  async countUsersByRole(roleId: string, tenantId: string): Promise<number> {
    return this.prismaService.user.count({
      where: {
        roleId,
        tenantId,
        deletedAt: null,
      },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────

  /**
   * findRoleByIdFlat() — internal guard query: check role exists in tenant.
   *
   * Used by updateRole() and deleteRole() before performing mutations.
   * Returns minimal shape — not exposed externally.
   */
  private async findRoleByIdFlat(
    id: string,
    tenantId: string,
  ): Promise<{ id: string } | null> {
    return this.prismaService.role.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  }
}
