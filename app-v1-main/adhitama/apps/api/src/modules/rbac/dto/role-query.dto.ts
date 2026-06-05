import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * RoleQueryDto — query parameters for GET /api/v1/roles.
 *
 * Prepared for future pagination support.
 * Repository currently returns all roles for a tenant without skip/take.
 * DTO is in place so the API contract does not change when pagination is added.
 */
export class RoleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
