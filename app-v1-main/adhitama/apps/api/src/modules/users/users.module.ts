import { Module } from '@nestjs/common';
import { PasswordModule } from '@infrastructure/password';
import { AuditModule } from '@modules/audit/audit.module';
import { UsersController } from './controllers/users.controller';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories/user.repository';
import { NipHelper } from './helpers/nip.helper';

/**
 * UsersModule — user management business module.
 *
 * NOT @Global — imported explicitly in AppModule.
 *
 * Dependency graph:
 *   UsersModule
 *     imports  PasswordModule    → PasswordService (Argon2id for default password)
 *     provides UserRepository    → DB access, tenant-scoped queries
 *     provides NipHelper         → NIP generation (EMP-000001 format)
 *     provides UserService       → business orchestration
 *     controller UsersController → 6 HTTP endpoints
 *
 * Global dependencies resolved automatically (no import needed):
 *   PrismaService  → DatabaseModule @Global
 *   ConfigService  → ConfigModule @Global
 *   JwtAuthGuard   → CoreAuthModule @Global
 *   PermissionGuard → CoreAuthModule @Global
 *
 * Exports UserService for future use by:
 *   - AdminModule (impersonation, force-logout)
 *   - ReportModule (user activity reports)
 */
@Module({
  imports: [PasswordModule, AuditModule],
  controllers: [UsersController],
  providers: [
    UserRepository,
    NipHelper,
    UserService,
  ],
  exports: [UserService],
})
export class UsersModule {}
