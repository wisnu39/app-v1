import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SecurityPolicyGuard } from './guards/security-policy.guard';
import { TokenService } from './services/token.service';
import { PermissionGuard } from '@common/guards/permission.guard';

/**
 * CoreAuthModule — global authentication infrastructure module.
 *
 * @Global: JwtAuthGuard, TokenService, and JwtStrategy are used
 * across all feature modules without needing explicit re-import.
 *
 * Provides:
 *   - TokenService  : sign/verify JWT tokens (used by AuthService)
 *   - JwtAuthGuard  : protect endpoints
 *   - JwtStrategy   : Passport strategy, auto-registered via PassportModule
 *
 * Exports (available globally):
 *   - TokenService  : injected by modules/auth AuthService
 *   - JwtAuthGuard  : applied via @UseGuards(JwtAuthGuard) anywhere
 *
 * JwtModule registered with empty config — TokenService provides
 * per-call secret and expiry options (access vs refresh distinction).
 * This avoids a single global secret that would apply to both token types.
 *
 * Dependencies from other @Global modules (no explicit import needed):
 *   - PrismaService  → DatabaseModule
 *   - ConfigService  → ConfigModule
 *
 * Import once in AppModule only.
 */
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Empty config — TokenService manages secrets per-call
    JwtModule.register({}),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    SecurityPolicyGuard,
    TokenService,
    PermissionGuard,
  ],
  exports: [
    JwtAuthGuard,
    SecurityPolicyGuard,
    TokenService,
    PermissionGuard,
  ],
})
export class CoreAuthModule {}
