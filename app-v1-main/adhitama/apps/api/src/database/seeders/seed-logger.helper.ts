/* eslint-disable no-console */
/**
 * SeedLogger — centralized logging for seed scripts.
 *
 * All seed output routes through this helper.
 * No raw console.log() scattered across seeder files.
 */
export const SeedLogger = {
  step: (label: string): void => {
    console.log(`\n[SEED] ▶  ${label}`);
  },

  success: (message: string): void => {
    console.log(`[SEED] ✅ ${message}`);
  },

  skip: (message: string): void => {
    console.log(`[SEED] ⏭  ${message}`);
  },

  info: (message: string): void => {
    console.log(`[SEED]    ${message}`);
  },

  warn: (message: string): void => {
    console.warn(`[SEED] ⚠️  ${message}`);
  },

  error: (message: string, err?: unknown): void => {
    console.error(`[SEED] ❌ ${message}`);
    if (err instanceof Error) {
      console.error(`[SEED]    ${err.message}`);
    }
  },

  divider: (): void => {
    console.log('[SEED] ' + '─'.repeat(52));
  },
};
