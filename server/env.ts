import crypto from 'node:crypto';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();

  if (secret && secret.length >= 32) return secret;

  if (isProduction) {
    throw new Error(
      'SESSION_SECRET must be set to at least 32 characters in production. ' +
        'Generate one with: openssl rand -base64 32',
    );
  }

  if (secret) {
    console.warn('[env] SESSION_SECRET is shorter than 32 characters; using an ephemeral secret.');
  }

  // Ephemeral per-process secret keeps local dev working without setup.
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
