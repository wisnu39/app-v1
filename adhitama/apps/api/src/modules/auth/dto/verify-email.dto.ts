import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

/**
 * VerifyEmailDto — request body for POST /api/v1/auth/verify-email.
 *
 * Minimal request shape with a single high-entropy verification token.
 * Using a dedicated DTO keeps the contract explicit and prevents extra fields.
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @Length(96, 96)
  @Matches(/^[0-9a-f]{96}$/)
  token!: string;
}
