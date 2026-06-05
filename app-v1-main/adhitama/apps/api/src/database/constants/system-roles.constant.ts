/**
 * System Role Definitions — Adhitama ERP
 *
 * Defines system roles and their default permission assignments.
 * Uses EXPLICIT mapping — not dynamic or wildcard.
 *
 * Rules:
 *   - OWNER and SUPER_ADMIN are protected by isSystemRole()
 *   - Seeder is ADDITIVE only — never removes existing assignments
 *   - Adding permissions here grants them on next seed run
 *   - Removing permissions here does NOT revoke them (non-destructive)
 */

export interface RoleDefinition {
  name: string;
  description: string;
}

export const SYSTEM_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: 'OWNER',
    description: 'Tenant owner — full access. Cannot be deleted or renamed.',
  },
  {
    name: 'SUPER_ADMIN',
    description: 'Super administrator — near-full access for platform management.',
  },
  {
    name: 'MANAGER',
    description: 'Manager — operational and financial management access.',
  },
  {
    name: 'STAFF',
    description: 'Staff member — read-only and operational task access.',
  },
];

/**
 * ROLE_PERMISSION_MAP — explicit permission keys per role.
 * Seeder assigns these during bootstrap.
 * All keys must exist in PERMISSION_DEFINITIONS.
 */
export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  OWNER: [
    'auth.me', 'auth.logout',
    'users.read', 'users.create', 'users.update', 'users.update-status', 'users.delete',
    'roles.read', 'roles.create', 'roles.update', 'roles.delete',
    'permissions.read', 'permissions.assign', 'permissions.remove',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.manage',
    'warehouse.read', 'warehouse.manage', 'warehouse.transfer', 'warehouse.opname',
    'rental.read', 'rental.create', 'rental.manage', 'rental.approve', 'rental.cancel', 'rental.return',
    'finance.read', 'finance.manage', 'finance.export',
    'invoice.read', 'invoice.create', 'invoice.finalize',
    'payment.read', 'payment.record',
    'operational.read', 'operational.assign', 'operational.report', 'operational.expense',
    'audit.read',
    'dashboard.read',
  ],

  SUPER_ADMIN: [
    'auth.me', 'auth.logout',
    'users.read', 'users.create', 'users.update', 'users.update-status', 'users.delete',
    'roles.read', 'roles.create', 'roles.update', 'roles.delete',
    'permissions.read', 'permissions.assign', 'permissions.remove',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.manage',
    'warehouse.read', 'warehouse.manage', 'warehouse.transfer', 'warehouse.opname',
    'rental.read', 'rental.create', 'rental.manage', 'rental.approve', 'rental.cancel', 'rental.return',
    'finance.read', 'finance.manage', 'finance.export',
    'invoice.read', 'invoice.create', 'invoice.finalize',
    'payment.read', 'payment.record',
    'operational.read', 'operational.assign', 'operational.report', 'operational.expense',
    'audit.read',
    'dashboard.read',
  ],

  MANAGER: [
    'auth.me', 'auth.logout',
    'users.read',
    'roles.read',
    'permissions.read',
    'inventory.read', 'inventory.manage',
    'warehouse.read', 'warehouse.manage', 'warehouse.transfer', 'warehouse.opname',
    'rental.read', 'rental.create', 'rental.manage', 'rental.approve', 'rental.cancel', 'rental.return',
    'finance.read', 'finance.export',
    'invoice.read', 'invoice.create', 'invoice.finalize',
    'payment.read', 'payment.record',
    'operational.read', 'operational.assign', 'operational.report', 'operational.expense',
    'audit.read',
    'dashboard.read',
  ],

  STAFF: [
    'auth.me', 'auth.logout',
    'users.read',
    'roles.read',
    'inventory.read',
    'warehouse.read',
    'rental.read', 'rental.return',
    'invoice.read',
    'payment.read',
    'operational.read', 'operational.report', 'operational.expense',
    'dashboard.read',
  ],
};
