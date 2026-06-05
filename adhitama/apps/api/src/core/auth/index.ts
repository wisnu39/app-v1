// ─── Module ──────────────────────────────────────────────────
export { CoreAuthModule } from './auth.module';

// ─── Guards ──────────────────────────────────────────────────
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { SecurityPolicyGuard } from './guards/security-policy.guard';

// ─── Decorators ──────────────────────────────────────────────
export { CurrentUser } from './decorators/current-user.decorator';

// ─── Services ────────────────────────────────────────────────
export { TokenService } from './services/token.service';

// ─── Types ───────────────────────────────────────────────────
export type { AuthUser } from './types/auth-user.type';

// ─── Interfaces ──────────────────────────────────────────────
export type {
  JwtPayload,
  TokenPair,
  SignPayload,
} from './interfaces/jwt-payload.interface';
