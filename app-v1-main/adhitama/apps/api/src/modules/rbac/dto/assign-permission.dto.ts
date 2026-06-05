import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * AssignPermissionDto — request body for POST /api/v1/roles/:id/permissions.
 *
 * Accepts an array of permission UUIDs to assign to the role.
 * Duplicate IDs are deduplicated in RbacService before assignment.
 * Already-assigned permissions are silently skipped (skipDuplicates).
 */
export class AssignPermissionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
