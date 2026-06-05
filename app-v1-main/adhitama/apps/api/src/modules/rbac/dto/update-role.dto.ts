import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * UpdateRoleDto — request body for PATCH /api/v1/roles/:id.
 *
 * All fields optional — only provided fields are updated.
 * System role protection enforced in RbacService, not here.
 *
 * Excluded by design:
 *   tenantId    → from JWT
 *   updatedById → set from JWT in controller
 */
export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
