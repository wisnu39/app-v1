/**
 * System Permission Definitions — Adhitama ERP
 *
 * SINGLE SOURCE OF TRUTH for all system permissions.
 * Add permissions here as new modules are built.
 * Permission keys are IMMUTABLE once seeded in production.
 *
 * Format: { key: 'module.action', module: 'module', description: '...' }
 * Convention: lowercase, dot-separated, no spaces or hyphens in key
 *
 * Rules:
 *   - Never remove keys that exist in production (breaks RBAC silently)
 *   - Adding new keys requires a seed re-run
 *   - Tenants cannot create custom permission keys (system-seeded only)
 */

export interface PermissionDefinition {
  key: string;
  module: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // ─── Auth ─────────────────────────────────────────────────
  { key: 'auth.me',     module: 'auth', description: 'View own profile and security state' },
  { key: 'auth.logout', module: 'auth', description: 'Logout from current and all sessions' },

  // ─── Users ────────────────────────────────────────────────
  { key: 'users.read',          module: 'users', description: 'View user list and user details' },
  { key: 'users.create',        module: 'users', description: 'Create new user accounts' },
  { key: 'users.update',        module: 'users', description: 'Update user profile and information' },
  { key: 'users.update-status', module: 'users', description: 'Activate, deactivate, or suspend users' },
  { key: 'users.delete',        module: 'users', description: 'Soft-delete user accounts' },

  // ─── Roles ────────────────────────────────────────────────
  { key: 'roles.read',   module: 'roles', description: 'View roles and role details' },
  { key: 'roles.create', module: 'roles', description: 'Create new roles' },
  { key: 'roles.update', module: 'roles', description: 'Update role name and description' },
  { key: 'roles.delete', module: 'roles', description: 'Delete roles (only if no users assigned)' },

  // ─── Permissions ──────────────────────────────────────────
  { key: 'permissions.read',   module: 'permissions', description: 'View available system permissions' },
  { key: 'permissions.assign', module: 'permissions', description: 'Assign permissions to roles' },
  { key: 'permissions.remove', module: 'permissions', description: 'Remove permissions from roles' },

  // ─── Inventory ────────────────────────────────────────────
  { key: 'inventory.read',   module: 'inventory', description: 'View items, categories, and stock levels' },
  { key: 'inventory.create', module: 'inventory', description: 'Create new items and categories' },
  { key: 'inventory.update', module: 'inventory', description: 'Update item details and stock data' },
  { key: 'inventory.delete', module: 'inventory', description: 'Soft-delete items' },
  { key: 'inventory.manage', module: 'inventory', description: 'Full inventory management including stock operations' },

  // ─── Warehouse ────────────────────────────────────────────
  { key: 'warehouse.read',     module: 'warehouse', description: 'View warehouse stock and details' },
  { key: 'warehouse.manage',   module: 'warehouse', description: 'Manage warehouses, transfers, and stock opname' },
  { key: 'warehouse.transfer', module: 'warehouse', description: 'Approve and complete stock transfers' },
  { key: 'warehouse.opname',   module: 'warehouse', description: 'Conduct and finalize stock opname' },

  // ─── Rental ───────────────────────────────────────────────
  { key: 'rental.read',    module: 'rental', description: 'View rental orders and details' },
  { key: 'rental.create',  module: 'rental', description: 'Create new rental reservations' },
  { key: 'rental.manage',  module: 'rental', description: 'Manage full rental lifecycle' },
  { key: 'rental.approve', module: 'rental', description: 'Approve rental reservations and confirmations' },
  { key: 'rental.cancel',  module: 'rental', description: 'Cancel rental orders' },
  { key: 'rental.return',  module: 'rental', description: 'Process rental returns and inspections' },

  // ─── Finance / Invoice / Payment ──────────────────────────
  { key: 'finance.read',    module: 'finance', description: 'View financial reports and summaries' },
  { key: 'finance.manage',  module: 'finance', description: 'Full financial management' },
  { key: 'finance.export',  module: 'finance', description: 'Export financial data and reports' },
  { key: 'invoice.read',    module: 'finance', description: 'View invoices' },
  { key: 'invoice.create',  module: 'finance', description: 'Create invoices' },
  { key: 'invoice.finalize', module: 'finance', description: 'Finalize invoices (makes immutable)' },
  { key: 'payment.read',   module: 'finance', description: 'View payment records' },
  { key: 'payment.record', module: 'finance', description: 'Record new payments' },

  // ─── Operational ──────────────────────────────────────────
  { key: 'operational.read',    module: 'operational', description: 'View operational reports and assignments' },
  { key: 'operational.assign',  module: 'operational', description: 'Assign team members to orders' },
  { key: 'operational.report',  module: 'operational', description: 'Submit and manage operational reports' },
  { key: 'operational.expense', module: 'operational', description: 'Record and manage operational expenses' },

  // ─── Audit ────────────────────────────────────────────────
  { key: 'audit.read', module: 'audit', description: 'View audit logs and activity history' },

  // ─── Dashboard ────────────────────────────────────────────
  { key: 'dashboard.read', module: 'dashboard', description: 'View operational and financial dashboards' },
];

/** Total count — for seeder logging */
export const PERMISSION_COUNT = PERMISSION_DEFINITIONS.length;
