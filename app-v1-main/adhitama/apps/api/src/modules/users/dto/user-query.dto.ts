import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Allowed sort fields — mirrors repository whitelist */
export enum UserSortBy {
  NAME       = 'name',
  EMAIL      = 'email',
  NIP        = 'nip',
  STATUS     = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

/** Sort direction */
export enum SortOrder {
  ASC  = 'asc',
  DESC = 'desc',
}

/**
 * UserQueryDto — query parameters for GET /api/v1/users.
 *
 * ValidationPipe with enableImplicitConversion: true handles
 * string-to-number conversion for page and limit (query params arrive as strings).
 */
export class UserQueryDto {
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

  @IsOptional()
  @IsEnum(UserSortBy, {
    message: `sortBy must be one of: ${Object.values(UserSortBy).join(', ')}`,
  })
  sortBy?: UserSortBy;

  @IsOptional()
  @IsEnum(SortOrder, {
    message: `sortOrder must be asc or desc`,
  })
  sortOrder?: SortOrder;
}
