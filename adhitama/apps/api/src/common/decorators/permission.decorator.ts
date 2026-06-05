import { SetMetadata } from '@nestjs/common';
import { REQUIRED_PERMISSION_KEY } from '@common/constants/permission.constants';

/**
 * @Permission() — declares required RBAC permissions for a route.
 *
 * Works in conjunction with PermissionGuard.
 * MUST be used with @UseGuards(JwtAuthGuard, PermissionGuard) on the route or controller.
 *
 * Permission check strategy: ANY match (OR logic).
 * User needs to have at least ONE of the listed permissions.
 *
 * Supports single or multiple permissions:
 *
 *   Single permission:
 *     @UseGuards(JwtAuthGuard, PermissionGuard)
 *     @Permission('inventory.read')
 *     @Get('items')
 *     getItems() { ... }
 *
 *   Multiple permissions (ANY match — user needs at least one):
 *     @UseGuards(JwtAuthGuard, PermissionGuard)
 *     @Permission('inventory.read', 'inventory.manage')
 *     @Get('items')
 *     getItems() { ... }
 *
 *   Applied at controller level (all routes require permission):
 *     @UseGuards(JwtAuthGuard, PermissionGuard)
 *     @Permission('finance.report')
 *     @Controller('finance')
 *     class FinanceController { ... }
 *
 * Permission naming convention:
 *   Format: {module}.{action}
 *   Examples: 'inventory.read', 'rental.approve', 'invoice.finalize'
 *   See PERMISSION_CONVENTION in permission.constants.ts for full list.
 *
 * Routes WITHOUT @Permission():
 *   PermissionGuard will allow access if no metadata is set.
 *   This means public-to-authenticated endpoints (protected by JwtAuthGuard only)
 *   do not need @Permission().
 *
 * Metadata storage:
 *   Stored as string[] under REQUIRED_PERMISSION_KEY via NestJS SetMetadata.
 *   PermissionGuard retrieves via Reflector.
 *
 * @param permissions - One or more permission keys in module.action format
 */
export const Permission = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissions);
