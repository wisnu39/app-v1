import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * CreateRoleDto — request body for POST /api/v1/roles.
 *
 * Excluded by design (server-side only):
 *   tenantId     → extracted from JWT via @CurrentUser()
 *   createdById  → set from JWT in controller
 *   isSystemRole → never set by client; system roles are seeded
 */
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
