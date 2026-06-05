/**
 * Permission Constants — Adhitama ERP RBAC
 *
 * Centralized constants for the permission system.
 * Both @Permission() decorator and PermissionGuard MUST use these constants.
 * Hardcoding the metadata key string in either file is FORBIDDEN.
 */

/**
 * Metadata key used by @Permission() decorator to store required permissions.
 * PermissionGuard reads this key via NestJS Reflector to retrieve the required list.
 *
 * Used as:
 *   SetMetadata(REQUIRED_PERMISSION_KEY, permissions)  // in decorator
 *   reflector.get(REQUIRED_PERMISSION_KEY, handler)    // in guard
 */
export const REQUIRED_PERMISSION_KEY = 'required_permission' as const;

/**
 * Permission naming convention — module.action format.
 *
 * All permission keys MUST follow:
 *   {module}.{action}
 *
 * Examples:
 *   users.read          — list and view users
 *   users.create        — create new user
 *   users.update        — update user data
 *   users.delete        — soft-delete user
 *   inventory.read      — view items and stock
 *   inventory.update    — modify items
 *   inventory.manage    — full inventory management
 *   rental.read         — view rental orders
 *   rental.create       — create new rental reservation
 *   rental.approve      — approve reservation to confirmed
 *   rental.cancel       — cancel rental order
 *   warehouse.read      — view warehouse data
 *   warehouse.transfer  — approve stock transfers
 *   invoice.read        — view invoices
 *   invoice.create      — create invoice
 *   invoice.finalize    — finalize invoice (makes it immutable)
 *   payment.read        — view payment records
 *   payment.record      — record a payment
 *   finance.report      — view financial reports
 *   finance.export      — export financial data
 *   operational.assign  — assign team to order
 *   operational.report  — submit operational report
 *   operational.expense — record operational expense
 *
 * Convention rules:
 *   - Lowercase only — no uppercase
 *   - Dot (.) separates module from action — no spaces, hyphens in key
 *   - Permission keys are seeded in DB during deployment
 *   - Never created dynamically at runtime
 *   - Tenant cannot define custom permission keys
 */
export const PERMISSION_CONVENTION = '{module}.{action}' as const;
