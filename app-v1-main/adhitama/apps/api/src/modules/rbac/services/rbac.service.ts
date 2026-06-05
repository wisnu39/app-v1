import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SYSTEM_ROLE_NAMES, isSystemRole } from '@common/constants/system-role.constants';
import { AUDIT_EVENT } from '@modules/audit/constants';
import { AuditService } from '@modules/audit/services';
import { RbacRepository } from '../repositories/rbac.repository';
import type {
  RoleRecord,
  RoleWithPermissions,
  PermissionRecord,
  CreateRoleData,
  UpdateRoleData,
} from '../repositories/rbac.repository.types';

// ─── Service Input Types ──────────────────────────────────────

/**
 * CreateRoleInput — caller-facing input for RbacService.createRole().
 */
export interface CreateRoleInput {
  tenantId: string;
  name: string;
  description?: string | null;
  /** ID of the requesting user — for audit trail storage in createdById */
  requestedById: string;
  auditContext?: AuditRequestContext;
}

/**
 * UpdateRoleInput — partial update for RbacService.updateRole().
 */
export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  /** ID of the requesting user — stored in updatedById */
  requestedById: string;
  auditContext?: AuditRequestContext;
}

/**
 * AssignPermissionsInput — input for RbacService.assignPermissions().
 */
export interface AssignPermissionsInput {
  roleId: string;
  tenantId: string;
  permissionIds: string[];
  auditContext?: AuditRequestContext;
}

interface AuditRequestContext {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

/**
 * RbacService — RBAC business orchestration layer.
 *
 * Responsibilities:
 *   - Enforce system role protection (OWNER, SUPER_ADMIN cannot be mutated)
 *   - Validate role existence and tenant scope on every mutation
 *   - Guard against duplicate role names within a tenant
 *   - Guard against deleting roles with active users
 *   - Validate permission existence before assignment
 *   - Deduplicate permission IDs before batch operations
 *   - Map repository structures to service-level response types
 *   - Use Prisma transactions for multi-step operations
 *
 * NOT responsible for:
 *   - HTTP concerns → RbacController (Phase 3.7)
 *   - DB access → RbacRepository
 *   - JWT / auth → CoreAuthModule
 *
 * System roles protected (from SYSTEM_ROLE_NAMES constant):
 *   - OWNER      : cannot be renamed, deleted, or have permissions modified
 *   - SUPER_ADMIN: cannot be renamed, deleted, or have permissions modified
 *
 * Audit events emitted from this service:
 *   - ROLE_CREATED
 *   - ROLE_UPDATED
 *   - ROLE_DELETED
 *   - PERMISSIONS_ASSIGNED
 *   - PERMISSION_REMOVED
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly rbacRepository: RbacRepository,
    private readonly auditService: AuditService,
  ) {}

  // ─── Role Read Operations ──────────────────────────────────

  /**
   * listRoles() — list all roles for a tenant with user counts.
   *
   * Fetches flat role list then enriches with userCount for each.
   * userCount is needed by UI for role management display.
   */
  async listRoles(tenantId: string): Promise<RoleWithPermissions[]> {
    const roles = await this.rbacRepository.findAllRoles(tenantId);

    // Enrich each role with permissions + userCount
    const enriched = await Promise.all(
      roles.map(async (role) => {
        const full = await this.rbacRepository.findRoleById(role.id, tenantId);
        return full!;
      }),
    );

    return enriched;
  }

  /**
   * getRole() — get a single role with its permissions and user count.
   * @throws NotFoundException if role not found in tenant
   */
  async getRole(id: string, tenantId: string): Promise<RoleWithPermissions> {
    const role = await this.rbacRepository.findRoleById(id, tenantId);

    if (!role) {
      throw new NotFoundException(`Role not found`);
    }

    return role;
  }

  // ─── Role Write Operations ─────────────────────────────────

  /**
   * createRole() — create a new tenant-scoped role.
   *
   * Steps:
   *   1. Assert name is not a system role name
   *   2. Assert name is unique in tenant
   *   3. Create via repository
   */
  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    const { tenantId, name, description, requestedById } = input;

    // Rule 1: cannot create a role with a system role name
    // This prevents circumventing system role protection
    this.assertNotSystemRole(name);

    // Rule 2: name must be unique within tenant
    await this.assertRoleNameUnique(name, tenantId, null);

    const data: CreateRoleData = {
      tenantId,
      name,
      description: description ?? null,
      createdById: requestedById,
    };

    const role = await this.rbacRepository.createRole(data);

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: input.auditContext?.userId ?? requestedById,
      action: AUDIT_EVENT.ROLE_CREATED,
      entityType: 'Role',
      entityId: role.id,
      sessionId: input.auditContext?.sessionId ?? null,
      metadata: {
        name,
        description: description ?? null,
      },
      ipAddress: input.auditContext?.ipAddress ?? null,
      userAgent: input.auditContext?.userAgent ?? null,
    });

    this.logger.log(
      `Role created — roleId=${role.id}, name=${role.name}, tenantId=${tenantId}`,
    );

    return role;
  }

  /**
   * updateRole() — update role name and/or description.
   *
   * Steps:
   *   1. Validate role exists in tenant
   *   2. Assert role is not a system role (by current name)
   *   3. If name changes: assert new name is not a system role name
   *   4. If name changes: assert new name is unique in tenant
   *   5. Update via repository
   */
  async updateRole(
    id: string,
    tenantId: string,
    input: UpdateRoleInput,
  ): Promise<RoleRecord> {
    const { name, description, requestedById } = input;

    // Rule: role must exist in tenant
    const existing = await this.validateRoleExists(id, tenantId);

    // Rule: cannot rename a system role
    this.assertNotSystemRole(existing.name);

    // Rule: new name cannot be a system role name
    if (name !== undefined && name !== existing.name) {
      this.assertNotSystemRole(name);
      await this.assertRoleNameUnique(name, tenantId, id);
    }

    const data: UpdateRoleData = {
      ...(name        !== undefined ? { name }        : {}),
      ...(description !== undefined ? { description } : {}),
      updatedById: requestedById,
    };

    const updated = await this.rbacRepository.updateRole(id, tenantId, data);

    if (!updated) {
      throw new NotFoundException(`Role not found`);
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: input.auditContext?.userId ?? requestedById,
      action: AUDIT_EVENT.ROLE_UPDATED,
      entityType: 'Role',
      entityId: updated.id,
      sessionId: input.auditContext?.sessionId ?? null,
      metadata: {
        changedFields: Object.keys(data).filter((key) => key !== 'updatedById'),
      },
      ipAddress: input.auditContext?.ipAddress ?? null,
      userAgent: input.auditContext?.userAgent ?? null,
    });

    this.logger.log(`Role updated — roleId=${id}, tenantId=${tenantId}`);

    return updated;
  }

  /**
   * deleteRole() — delete a role after safety checks.
   *
   * Steps (in order):
   *   1. Validate role exists in tenant
   *   2. Assert role is not a system role
   *   3. Assert no users assigned (countUsersByRole must be 0)
   *   4. Delete via repository
   */
  async deleteRole(
    id: string,
    tenantId: string,
    auditContext?: AuditRequestContext,
  ): Promise<void> {
    // Rule: role must exist
    const existing = await this.validateRoleExists(id, tenantId);

    // Rule: system roles cannot be deleted
    this.assertNotSystemRole(existing.name);

    // Rule: cannot delete role with assigned users
    await this.assertRoleDeletable(id, tenantId);

    const deleted = await this.rbacRepository.deleteRole(id, tenantId);

    if (!deleted) {
      throw new NotFoundException(`Role not found`);
    }

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: auditContext?.userId ?? null,
      action: AUDIT_EVENT.ROLE_DELETED,
      entityType: 'Role',
      entityId: existing.id,
      sessionId: auditContext?.sessionId ?? null,
      metadata: {
        name: existing.name,
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    this.logger.log(`Role deleted — roleId=${id}, tenantId=${tenantId}`);
  }

  // ─── Permission Operations ────────────────────────────────

  /**
   * listPermissions() — list all system-level permissions.
   * Permissions are global — no tenant filter.
   */
  async listPermissions(): Promise<PermissionRecord[]> {
    return this.rbacRepository.findAllPermissions();
  }

  /**
   * assignPermissions() — assign one or more permissions to a role.
   *
   * Steps (inside a transaction):
   *   1. Validate role exists in tenant
   *   2. Assert role is not a system role
   *   3. Deduplicate permissionIds
   *   4. Validate all permissionIds exist in DB
   *   5. Assign via repository (skipDuplicates)
   *
   * Transaction ensures validation + assignment are atomic.
   * If permission validation passes but assignment fails — nothing is written.
   */
  async assignPermissions(input: AssignPermissionsInput): Promise<RoleWithPermissions> {
    const { roleId, tenantId, permissionIds } = input;

    // Step 1+2: role must exist and not be a system role
    const role = await this.validateRoleExists(roleId, tenantId);
    this.assertNotSystemRole(role.name);

    // Step 3: deduplicate
    const uniqueIds = [...new Set(permissionIds)];

    if (uniqueIds.length === 0) {
      throw new BadRequestException('permissionIds must not be empty');
    }

    // Steps 4+5: validate permissions exist + assign
    const existingCount = await this.rbacRepository.countPermissionsByIds(
      uniqueIds,
    );

    if (existingCount !== uniqueIds.length) {
      throw new BadRequestException(
        `One or more permissionIds do not exist. ` +
          `Provided: ${uniqueIds.length}, found: ${existingCount}`,
      );
    }

    await this.rbacRepository.assignPermissions(roleId, uniqueIds);

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: input.auditContext?.userId ?? null,
      action: AUDIT_EVENT.PERMISSIONS_ASSIGNED,
      entityType: 'Role',
      entityId: role.id,
      sessionId: input.auditContext?.sessionId ?? null,
      metadata: {
        permissionIds: uniqueIds,
      },
      ipAddress: input.auditContext?.ipAddress ?? null,
      userAgent: input.auditContext?.userAgent ?? null,
    });

    this.logger.log(
      `Permissions assigned — roleId=${roleId}, count=${uniqueIds.length}`,
    );

    // Return updated role with full permission list
    const updated = await this.rbacRepository.findRoleById(roleId, tenantId);
    return updated!;
  }

  /**
   * removePermission() — remove a single permission from a role.
   *
   * Steps (inside a transaction):
   *   1. Validate role exists in tenant
   *   2. Assert role is not a system role
   *   3. Validate permission exists
   *   4. Remove via repository (idempotent)
   *
   * Does NOT throw if permission was not assigned — idempotent behavior.
   */
  async removePermission(
    roleId: string,
    tenantId: string,
    permissionId: string,
    auditContext?: AuditRequestContext,
  ): Promise<RoleWithPermissions> {
    // Step 1+2: role must exist and not be a system role
    const role = await this.validateRoleExists(roleId, tenantId);
    this.assertNotSystemRole(role.name);

    // Steps 3+4: validate permission + remove — in a transaction
    const permExists = await this.rbacRepository.permissionExists(permissionId);

    if (!permExists) {
      throw new BadRequestException(
        `Permission with id "${permissionId}" does not exist`,
      );
    }

    await this.rbacRepository.removePermission(roleId, permissionId);

    this.auditService.fireAndForget({
      tenantId,
      actorUserId: auditContext?.userId ?? null,
      action: AUDIT_EVENT.PERMISSION_REMOVED,
      entityType: 'Role',
      entityId: role.id,
      sessionId: auditContext?.sessionId ?? null,
      metadata: {
        permissionId,
      },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    this.logger.log(
      `Permission removed — roleId=${roleId}, permissionId=${permissionId}`,
    );

    // Return updated role with full permission list
    const updated = await this.rbacRepository.findRoleById(roleId, tenantId);
    return updated!;
  }

  // ─── Private Guard Methods ────────────────────────────────

  /**
   * validateRoleExists() — ensure role exists in tenant.
   * Returns the flat role record for subsequent checks.
   * @throws NotFoundException if not found
   */
  private async validateRoleExists(
    id: string,
    tenantId: string,
  ): Promise<RoleRecord> {
    const role = await this.rbacRepository.findRoleById(id, tenantId);

    if (!role) {
      throw new NotFoundException(`Role not found`);
    }

    return role;
  }

  /**
   * assertRoleNameUnique() — ensure role name is not already taken in tenant.
   *
   * @param name     - Role name to check
   * @param tenantId - Scope
   * @param excludeId - ID of role being updated (skip self-comparison on update)
   * @throws ConflictException if name already exists
   */
  private async assertRoleNameUnique(
    name: string,
    tenantId: string,
    excludeId: string | null,
  ): Promise<void> {
    const existing = await this.rbacRepository.findRoleByName(name, tenantId);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `A role with the name "${name}" already exists in this tenant`,
      );
    }
  }

  /**
   * assertRoleDeletable() — ensure no active users are assigned to this role.
   * @throws UnprocessableEntityException if users are assigned
   */
  private async assertRoleDeletable(
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    const userCount = await this.rbacRepository.countUsersByRole(
      roleId,
      tenantId,
    );

    if (userCount > 0) {
      throw new UnprocessableEntityException(
        `Cannot delete role — ${userCount} user(s) are currently assigned to it. ` +
          `Reassign users before deleting this role.`,
      );
    }
  }

  /**
   * assertNotSystemRole() — ensure a role name is not system-critical.
   *
   * Synchronous check against SYSTEM_ROLE_NAMES constant.
   * Applies to: delete, rename (old name), rename (new name), permission mutation.
   *
   * @throws ForbiddenException if the role name is system-critical
   */
  private assertNotSystemRole(roleName: string): void {
    if (isSystemRole(roleName)) {
      throw new ForbiddenException(
        `Role "${roleName}" is a system role and cannot be modified or deleted. ` +
          `System roles: ${SYSTEM_ROLE_NAMES.join(', ')}`,
      );
    }
  }
}
