import Joi from 'joi';

/**
 * Environment Validation Schema — Adhitama ERP
 *
 * Dijalankan saat bootstrap oleh ConfigModule.
 * Jika ada variable yang missing atau invalid, app GAGAL START
 * dengan pesan error yang jelas (fail-fast strategy).
 *
 * Sesuai SECURITY_DESIGN.md:
 *   - Semua credential wajib dari environment variable
 *   - Tidak ada secret hardcoded
 *   - JWT secrets minimum 32 karakter (256-bit entropy)
 *   - Access + Refresh secret HARUS berbeda
 *
 * Sesuai MASTER_IMPLEMENTATION_PLAN.md:
 *   - Hanya variable yang aktif dipakai di phase ini yang divalidasi
 *   - Tambah variable baru seiring phase yang memerlukannya
 */
export const validationSchema = Joi.object({
  // ─── Application ───────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development')
    .description('Application runtime environment'),

  PORT: Joi.number()
    .integer()
    .min(1024)
    .max(65535)
    .default(3000)
    .description('HTTP server port'),

  // ─── Database ──────────────────────────────────────────────
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required()
    .description('PostgreSQL connection string'),

  // ─── Redis ─────────────────────────────────────────────────
  REDIS_HOST: Joi.string()
    .hostname()
    .default('localhost')
    .description('Redis server hostname'),

  REDIS_PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .default(6379)
    .description('Redis server port'),

  REDIS_PASSWORD: Joi.string()
    .min(8)
    .required()
    .description('Redis authentication password'),

  // ─── JWT Auth (Phase 2) ────────────────────────────────────
  // Security requirements:
  //   - Minimum 32 characters enforced (256-bit entropy floor)
  //   - Access and refresh secrets MUST be distinct values
  //   - Never share these values across environments
  //   - Rotate secrets when a breach is suspected
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT access token signing secret. Minimum 32 characters.'),

  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m')
    .description(
      'Access token expiry. Format: {number}{unit} e.g. 15m, 1h, 1d. ' +
        'Keep short — access tokens are stateless and cannot be revoked before expiry.',
    ),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description(
      'JWT refresh token signing secret. Minimum 32 characters. ' +
        'MUST be different from JWT_ACCESS_SECRET.',
    ),

  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d')
    .description(
      'Refresh token expiry. Format: {number}{unit} e.g. 7d, 30d. ' +
        'Longer-lived — revocation is enforced via Session table.',
    ),

  // ─── Mail Infrastructure (Phase 2) ─────────────────────────
  MAIL_PROVIDER: Joi.string()
    .valid('none', 'smtp')
    .default('none')
    .description('Mail provider. Use smtp when an SMTP server is configured.'),

  MAIL_SMTP_HOST: Joi.string()
    .hostname()
    .when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() })
    .description('SMTP server hostname, required when MAIL_PROVIDER=smtp.'),

  MAIL_SMTP_PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .default(587)
    .when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() })
    .description('SMTP server port, required when MAIL_PROVIDER=smtp.'),

  MAIL_SMTP_SECURE: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false)
    .description('Use SMTPS if true; otherwise use STARTTLS if supported by server.'),

  MAIL_SMTP_USERNAME: Joi.string()
    .when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() })
    .description('SMTP username, required when MAIL_PROVIDER=smtp.'),

  MAIL_SMTP_PASSWORD: Joi.string()
    .min(8)
    .when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() })
    .description('SMTP password or API key, required when MAIL_PROVIDER=smtp.'),

  MAIL_SMTP_FROM: Joi.string()
    .email()
    .when('MAIL_PROVIDER', { is: 'smtp', then: Joi.required(), otherwise: Joi.optional() })
    .description('Default MAIL From address for outbound emails.'),

  MAIL_SMTP_FROM_NAME: Joi.string().default('Adhitama ERP').description('Optional display name for outbound email sender.'),

  EMAIL_VERIFICATION_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .default('')
    .description(
      'Optional verification URL template. Use {{token}} as placeholder for the raw verification token.',
    ),

  PASSWORD_RESET_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .default('')
    .description(
      'Optional password reset URL template. Use {{token}} as placeholder for the raw reset token.',
    ),
})
  // Allow unknown keys — OS may inject additional env vars (CI/CD, Docker, etc.)
  // abortEarly: false → show ALL validation errors at once, not just first
  .options({ allowUnknown: true, abortEarly: false });
