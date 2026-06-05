/**
 * System Role Constants — Adhitama ERP
 *
 * Defines system-critical role names that MUST NOT be deleted
 * or deactivated through the RBAC management API.
 *
 * These roles are seeded during deployment and protected by
 * RbacService validation before any delete/update operation.
 *
 * Future seed data will create Role rows matching these names.
 * RbacService checks against this list before allowing deletion.
 *
 * Usage:
 *   if (SYSTEM_ROLE_NAMES.includes(role.name)) {
 *     throw new ConflictException('System roles cannot be deleted');
 *   }
 */
export const SYSTEM_ROLE_NAMES = ['OWNER', 'SUPER_ADMIN'] as const;

/** Type representing the union of system role name strings */
export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number];

/**
 * Checks whether a role name is system-critical.
 * Used by RbacService before delete/update operations.
 *
 * @param name - Role name to check
 */
export const isSystemRole = (name: string): boolean =>
  (SYSTEM_ROLE_NAMES as readonly string[]).includes(name);
