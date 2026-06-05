import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * ResendVerificationDto — request body for POST /api/v1/auth/resend-verification.
 *
 * Uses email to locate the user and issue a fresh verification token.
 */
export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;
}
