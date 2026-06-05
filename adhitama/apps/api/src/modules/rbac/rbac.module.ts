import { Module } from '@nestjs/common';
import { AuditModule } from '@modules/audit/audit.module';
import { RbacController } from './controllers/rbac.controller';
import { RbacService } from './services/rbac.service';
import { RbacRepository } from './repositories/rbac.repository';

/**
 * RbacModule — Role and Permission management business module.
 *
 * NOT @Global — imported explicitly in AppModule.
 *
 * Dependency graph:
 *   RbacModule
 *     provides RbacRepository  → DB access (roles, permissions, rolePermissions)
 *     provides RbacService     → business orchestration + rule enforcement
 *     controller RbacController → 8 HTTP endpoints
 *
 * Global dependencies resolved automatically (no import needed):
 *   PrismaService   → DatabaseModule @Global
 *   ConfigService   → ConfigModule @Global
 *   JwtAuthGuard    → CoreAuthModule @Global
 *   PermissionGuard → CoreAuthModule @Global
 *
 * No PasswordModule needed — RBAC does not hash passwords.
 *
 * Exports RbacService for potential future use by:
 *   - UserModule (when assigning default role on user creation)
 *   - AdminModule (cross-tenant RBAC management)
 */
@Module({
  imports: [AuditModule],
  controllers: [RbacController],
  providers: [
    RbacRepository,
    RbacService,
  ],
  exports: [RbacService],
})
export class RbacModule {}
