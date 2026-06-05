import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * LoginDto — request body for POST /api/v1/auth/login.
 *
 * Uses `identifier` instead of `email` because the system supports:
 *   - Login via email address
 *   - Login via NIP (Nomor Induk Pegawai) for employees
 *
 * Identifier type detection is performed by AuthService:
 *   contains '@' → email path → AuthRepository.findByEmail()
 *   otherwise    → NIP path  → AuthRepository.findByNip()
 *
 * Validation:
 *   - IsString + IsNotEmpty: prevents empty/null/undefined
 *   - MaxLength: prevents excessively long inputs (DoS mitigation)
 *   - No format validation on identifier intentionally — AuthService
 *     does the routing, and error response is always generic 401
 *
 * Security:
 *   - whitelist: true in ValidationPipe strips unknown fields
 *   - forbidNonWhitelisted: true rejects requests with extra fields
 */
export class LoginDto {
  /**
   * Email address or NIP.
   * Detection logic in AuthService — this field accepts both formats.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier!: string;

  /**
   * Plaintext password.
   * Verified against stored Argon2id hash in AuthService.
   * NEVER logged, never stored.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
