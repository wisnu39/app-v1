import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * PasswordService — Argon2id password hashing and verification.
 *
 * Responsibilities:
 *   - Hash plaintext passwords before storage
 *   - Verify plaintext passwords against stored hashes
 *
 * This service will be used by:
 *   - AuthService.login()           — verify password at login
 *   - AuthService.changePassword()  — hash new password on change
 *   - AuthService.resetPassword()   — hash reset password
 *   - UserService.provisionUser()   — hash default password on user creation
 *
 * Security rules (SECURITY_DESIGN.md):
 *   - NEVER log plaintext passwords
 *   - NEVER log password hashes
 *   - NEVER log verification results in detail
 *   - NEVER expose raw argon2 errors to API responses
 *   - Raw argon2 errors are logged internally, generic message returned
 *
 * Algorithm: Argon2id
 *   - Hybrid of Argon2i (side-channel resistance) and
 *     Argon2d (GPU resistance)
 *   - Recommended by OWASP for password hashing
 *   - Winner of Password Hashing Competition (PHC) 2015
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  /**
   * Argon2id configuration.
   *
   * Explicit values — do not rely on library defaults as they may
   * change across versions, causing silent behavior drift.
   *
   * OWASP recommendations (2024):
   *   memoryCost : 19456 KiB (19 MiB) — minimum; 64 MiB preferred
   *   timeCost   : 2 iterations minimum
   *   parallelism: 1
   *
   * We use 64 MiB memory (65536 KiB) for stronger protection.
   * Tuned for server-side use — not client/mobile constraints.
   * Adjust memoryCost down if server memory becomes a bottleneck.
   */
  private readonly ARGON2_CONFIG = {
    type: argon2.argon2id,
    /** Memory cost in KiB. 65536 = 64 MiB. */
    memoryCost: 65536,
    /** Number of iterations. */
    timeCost: 3,
    /** Degree of parallelism. */
    parallelism: 1,
  } as const;

  /**
   * Hash a plaintext password using Argon2id.
   *
   * The returned hash string includes the algorithm parameters and salt,
   * making it self-contained for future verification.
   *
   * @param plain - Plaintext password. Never stored or logged.
   * @returns Argon2id hash string.
   * @throws InternalServerErrorException if hashing fails.
   */
  async hash(plain: string): Promise<string> {
    try {
      return await argon2.hash(plain, this.ARGON2_CONFIG);
    } catch (error: unknown) {
      // Log the raw error internally for debugging — never surface to caller
      this.logger.error(
        'Password hashing failed',
        error instanceof Error ? error.message : 'Unknown argon2 error',
      );

      // Throw generic exception — no internal detail exposed
      throw new InternalServerErrorException(
        'Password processing failed. Please try again.',
      );
    }
  }

  /**
   * Verify a plaintext password against a stored Argon2id hash.
   *
   * Returns false for ANY verification failure — does not distinguish
   * between "wrong password" and "hash format error" intentionally.
   * Callers should NOT branch on specific failure reasons for security.
   *
   * @param plain  - Plaintext password to verify. Never stored or logged.
   * @param hashed - Stored Argon2id hash to verify against.
   * @returns true if password matches, false otherwise.
   * @throws InternalServerErrorException if argon2 itself throws unexpectedly.
   */
  async verify(plain: string, hashed: string): Promise<boolean> {
    try {
      return await argon2.verify(hashed, plain);
    } catch (error: unknown) {
      // argon2.verify throws on malformed hash strings (not on wrong passwords)
      // Log internally for debugging, return false to caller
      this.logger.error(
        'Password verification encountered an unexpected error',
        error instanceof Error ? error.message : 'Unknown argon2 error',
      );

      // Do not throw — treat unexpected errors as verification failure
      // Throwing here would leak information about hash validity
      return false;
    }
  }
}
