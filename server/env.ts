import crypto from 'node:crypto';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Misconfiguration is reported, not thrown at import time.
 *
 * Throwing while the module loads takes the whole serverless function down
 * with an opaque 500 and no indication of the cause. Recording the problem
 * lets the API answer with a message naming the exact variable to set.
 */
export type ConfigError = { variable: string; message: string };

let configError: ConfigError | null = null;

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();

  if (secret && secret.length >= 32) return secret;

  if (isProduction) {
    configError = {
      variable: 'SESSION_SECRET',
      message:
        'SESSION_SECRET is not set (or is shorter than 32 characters). ' +
        "Set it in your hosting provider's environment variables and redeploy. " +
        'Generate one with: openssl rand -base64 32',
    };
    // A per-instance random value is unusable on serverless - each instance
    // would reject the others' cookies - so this only keeps the process
    // alive long enough to report the problem.
    return crypto.randomBytes(32).toString('hex');
  }

  if (secret) {
    console.warn('[env] SESSION_SECRET is shorter than 32 characters; using an ephemeral secret.');
  }

  // Ephemeral per-process secret keeps local dev working with no setup.
  // Sessions do not survive a restart, which is the correct trade-off here.
  return crypto.randomBytes(32).toString('hex');
}

export const env = {
  isProduction,
  isTest,
  port: Number(process.env.PORT ?? 5000),
  sessionSecret: resolveSessionSecret(),
  databaseUrl: process.env.DATABASE_URL?.trim() || undefined,
  /** Extra origins permitted by CORS, comma-separated. */
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

/** Null when the environment is usable; otherwise the variable that is wrong. */
export function getConfigError(): ConfigError | null {
  return configError;
}
