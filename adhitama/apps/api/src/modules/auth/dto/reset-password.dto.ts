import { IsString, IsNotEmpty, MinLength, MaxLength, Matches, Length } from 'class-validator';

/**
 * ResetPasswordDto — request body for POST /api/v1/auth/reset-password.
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(96, 96)
  @Matches(/^[0-9a-f]{96}$/)
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
