import { IsString, IsNotEmpty } from 'class-validator';

/**
 * RefreshTokenDto — request body for POST /api/v1/auth/refresh.
 *
 * Accepts the raw refresh token (JWT string) issued at login
 * or from a previous refresh rotation.
 *
 * Validation:
 *   - IsString + IsNotEmpty: rejects null/empty payloads
 *   - No JWT structure validation here — TokenService.verifyRefreshToken()
 *     performs the cryptographic verification with UnauthorizedException on failure
 *
 * Security note:
 *   - Field name is `refreshToken` (camelCase) in the DTO
 *   - Raw token is passed to AuthService.refreshTokens() which passes it
 *     to TokenService for verification — never stored raw
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
