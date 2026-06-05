/**
 * RBAC Repository Types — Adhitama ERP
 *
 * Purpose-built types for RbacRepository inputs and returns.
 * NOT Prisma entities — explicit field selection only.
 *
 * Permission notes:
 *   - Permission table is GLOBAL (no tenantId)
 *   - Role table is TENANT-SCOPED
 *   - RolePermission is the join table linking them
 */

// ─── Input Types ─────────────────────────────────────────────

/**
 * CreateRoleData — input for RbacRepository.createRole().
 * tenantId is required — roles are always tenant-scoped.
 */
export interface CreateRoleData {
  tenantId: string;
  name: string;
  description?: string | null;
  /** ID of the user creating this role — for audit trail */
  createdById?: string | null;
}

/**
 * UpdateRoleData — partial update for RbacRepository.updateRole().
 * All fields optional — only provided fields are updated.
 */
export interface UpdateRoleData {
  name?: string;
  description?: string | null;
  /** ID of the user making this update — for audit trail */
  updatedById?: string | null;
}

// ─── Return Types ─────────────────────────────────────────────

/**
 * PermissionRecord — minimal permission shape.
 * No tenantId — permissions are global/system-level.
 */
export interface PermissionRecord {
  id: string;
  key: string;
  description: string | null;
  module: string;
}

/**
 * RoleRecord — flat role shape without permissions.
 * Used for list responses where permission detail is not needed.
 */
export interface RoleRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RoleWithPermissions — role with its full permission list.
 * Used for role detail and permission assignment responses.
 *
 * userCount: number of ACTIVE+INACTIVE+SUSPENDED users assigned to this role.
 * Does NOT exclude suspended — repository has no business rule knowledge.
 * Service layer applies business filtering if needed.
 */
export interface RoleWithPermissions {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: PermissionRecord[];
  userCount: number;
}
