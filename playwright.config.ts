import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the production build by default, since that is what
 * actually ships. Point BASE_URL at a deployment to run the same specs
 * against production.
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';
const isExternal = process.env.BASE_URL !== undefined;

/**
 * Some sandboxes ship a Chromium build that does not match the installed
 * Playwright version. Use it when present rather than downloading.
 */
const PREINSTALLED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  // Against an external URL the app is already running.
  ...(isExternal
    ? {}
    : {
        webServer: [
          {
            // NODE_ENV=test disables the rate limiter. Leaving it on made the
            // suite fail nondeterministically once it exceeded the per-minute
            // ceiling, which tested the limiter rather than the app.
            command: 'npx tsx server/dev.ts',
            env: { NODE_ENV: 'test' },
            url: 'http://localhost:5000/api/health',
            reuseExistingServer: false,
            timeout: 60_000,
          },
          {
            command: 'npx vite preview --port 4173 --strictPort',
            url: 'http://localhost:4173/',
            reuseExistingServer: true,
            timeout: 60_000,
          },
        ],
      }),
});
