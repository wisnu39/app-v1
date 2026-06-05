import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * RequestPasswordResetDto — request body for POST /api/v1/auth/request-password-reset.
 */
export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;
}
