import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Signs in through the one-click demo button and waits for the dashboard. */
export async function signInAsDemo(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: /try the demo/i }).click();
  await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();
}

/** Fails the test if any serious or critical accessibility violation exists. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  // Wait for entrance animations to finish. Axe measures the computed pixel
  // colour, so a half-faded element reports its colour blended with the
  // background and fails contrast for reasons that vanish a frame later.
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, {
      timeout: 5_000,
    })
    .catch(() => {
      // Indefinite animations (loading shimmer) never settle; proceed anyway.
    });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  // Report the offending node and the measured values, not just a count:
  // a bare tally is not enough to act on when this fails in CI.
  const details = blocking.flatMap((v) =>
    v.nodes.map(
      (n) =>
        `${v.id} (${v.impact}) at ${n.target.join(' ')} :: ` +
        `${n.failureSummary?.replace(/\s+/g, ' ').trim()}`,
    ),
  );

  expect(details).toEqual([]);
}

/** Collects console errors and failed requests for a whole test. */
const FONT_CDN = 'fonts.googleapis.com';

/**
 * Some sandboxes re-terminate TLS and block the font CDN, which surfaces as a
 * cert error with no URL attached to the console message. The page is built to
 * fall back to the system font stack, so this is an environment artifact, not
 * an app fault. Narrowly scoped so real resource failures still fail the run.
 */
const ENV_NOISE = /ERR_CERT_AUTHORITY_INVALID|ERR_BLOCKED_BY_CLIENT/;

export function watchForErrors(page: Page): { errors: string[]; failures: string[] } {
  const errors: string[] = [];
  const failures: string[] = [];

  page.on('console', (m) => {
    if (m.type() === 'error' && !ENV_NOISE.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    const reason = r.failure()?.errorText ?? '';
    if (!r.url().includes(FONT_CDN) && !ENV_NOISE.test(reason)) {
      failures.push(`${r.url()} :: ${reason}`);
    }
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes(FONT_CDN)) {
      failures.push(`${r.status()} ${r.url()}`);
    }
  });

  return { errors, failures };
}
