/**
 * RBAC Module Types — Adhitama ERP
 *
 * Typed shapes for Role, Permission, and RolePermission operations.
 * NOT Prisma entities — purpose-built types.
 */

/**
 * RoleRecord — role shape returned by repository, used within module.
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
 * RoleWithPermissions — role with its assigned permission keys.
 */
export interface RoleWithPermissions extends RoleRecord {
  permissions: PermissionRecord[];
}

/**
 * RoleResponse — shape returned by RbacService to controller.
 * Includes userCount for display and deletion guard.
 */
export interface RoleResponse {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  userCount: number;
  permissions: PermissionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PermissionRecord — minimal permission shape.
 * Permissions are system-level, no tenantId.
 */
export interface PermissionRecord {
  id: string;
  key: string;
  description: string | null;
  module: string;
}

/**
 * PaginatedRoles — paginated roles list response.
 */
export interface PaginatedRoles {
  data: RoleResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * RoleListQuery — parameters for role listing.
 */
export interface RoleListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
