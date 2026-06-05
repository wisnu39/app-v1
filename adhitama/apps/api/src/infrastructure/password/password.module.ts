import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';

/**
 * PasswordModule — Argon2id password hashing infrastructure module.
 *
 * NOT @Global — imported explicitly by modules that need password operations:
 *   - modules/auth/auth.module.ts   (login, change-password, reset-password)
 *   - modules/user/user.module.ts   (user provisioning with default password)
 *
 * Why not @Global:
 *   - PasswordService is not needed application-wide
 *   - Explicit imports make dependency graph readable and auditable
 *   - Reduces risk of PasswordService being injected in wrong contexts
 *
 * Exports PasswordService so importing modules can use it via DI.
 */
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class PasswordModule {}
