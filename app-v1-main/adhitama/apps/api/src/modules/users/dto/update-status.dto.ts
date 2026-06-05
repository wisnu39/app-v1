import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * Valid user status values — mirrors UserStatus enum in Prisma schema.
 * Defined here to avoid importing Prisma types into the DTO layer.
 */
export enum UserStatus {
  ACTIVE    = 'ACTIVE',
  INACTIVE  = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * UpdateStatusDto — request body for PATCH /api/v1/users/:id/status.
 *
 * Only the target status is accepted.
 * Business transition rules are enforced in UserService.
 */
export class UpdateStatusDto {
  @IsEnum(UserStatus, {
    message: `status must be one of: ${Object.values(UserStatus).join(', ')}`,
  })
  @IsNotEmpty()
  status!: UserStatus;
}
