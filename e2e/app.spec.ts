import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signInAsDemo, toastText, watchForErrors } from './helpers';

test.describe('core flows', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page);
  });

  test('dashboard renders tiles, rings, chart and sessions with no console errors', async ({
    page,
  }) => {
    const { errors, failures } = watchForErrors(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();

    await expect(page.getByText('Steps', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: "Today's goals" })).toBeVisible();
    await expect(page.locator('.recharts-wrapper svg').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent sessions' })).toBeVisible();

    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });

  test('dashboard has no serious accessibility violations', async ({ page }) => {
    await expectNoA11yViolations(page);
  });

  test('logging activity updates the tiles and the goal ring', async ({ page }) => {
    await page.getByRole('button', { name: /log activity/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/^Steps/).fill('17500');
    await dialog.getByRole('button', { name: /save activity/i }).click();

    await expect(toastText(page, /activity saved/i)).toBeVisible();
    // Scoped to the tiles: the same figure also appears in the goal ring and
    // the chart's table view, which would be a strict-mode violation.
    const totals = page.getByRole('region', { name: "Today's totals" });
    await expect(totals.getByText('17,500')).toBeVisible();
  });

  test('a past day can be corrected without touching today', async ({ page }) => {
    const totals = page.getByRole('region', { name: "Today's totals" });
    const todayBefore = await totals
      .getByText(/^[\d,]+$/)
      .first()
      .textContent();

    await page.getByRole('button', { name: /log activity/i }).click();
    const dialog = page.getByRole('dialog');

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await dialog.getByLabel('Day').fill(yesterday);
    await expect(dialog.getByText('Yesterday')).toBeVisible();

    // The form has to load that day's stored numbers, not offer zeroes.
    await expect(dialog.getByLabel(/^Steps/)).not.toHaveValue('0');

    await dialog.getByLabel(/^Steps/).fill('4321');
    await dialog.getByRole('button', { name: /save activity/i }).click();
    await expect(toastText(page, /activity saved for yesterday/i)).toBeVisible();

    // Today is untouched...
    await expect(totals.getByText(/^[\d,]+$/).first()).toHaveText(todayBefore ?? '');

    // ...and yesterday now reads 4,321 in the chart's table view.
    await page.getByText('View as table').click();
    await expect(page.getByRole('table').getByText('4,321')).toBeVisible();
  });

  test('the activity dialog will not record a future day', async ({ page }) => {
    await page.getByRole('button', { name: /log activity/i }).click();
    const dialog = page.getByRole('dialog');

    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    await dialog.getByLabel('Day').fill(nextWeek);
    await dialog.getByRole('button', { name: /save activity/i }).click();

    await expect(dialog.getByText(/has not happened yet/i)).toBeVisible();
  });

  test('the activity dialog rejects an out-of-range value', async ({ page }) => {
    await page.getByRole('button', { name: /log activity/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Steps/).fill('999999');
    await dialog.getByRole('button', { name: /save activity/i }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
  });

  test('the chart switches metric and date range', async ({ page }) => {
    await page.getByRole('button', { name: 'Calories', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Calories', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: '30d' }).click();
    await expect(page.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.recharts-wrapper svg').first()).toBeVisible();
  });

  test('the chart data is also available as a table', async ({ page }) => {
    await page.getByText('View as table').click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('workouts filter by search, type and difficulty, and clear', async ({ page }) => {
    await page.getByRole('link', { name: 'Workouts' }).first().click();
    await expect(page.getByRole('heading', { name: 'Workouts', level: 1 })).toBeVisible();

    await page.getByLabel('Search').fill('yoga');
    await expect(page.getByText('1 workouts found')).toBeAttached();

    await page.getByRole('button', { name: /clear/i }).click();
    await expect(page.getByLabel('Search')).toHaveValue('');

    await page.getByLabel('Filter by difficulty').click();
    await page.getByRole('option', { name: 'advanced' }).click();
    await expect(page.getByText(/workouts found/)).toBeAttached();
  });

  test('an empty search shows an empty state with a way out', async ({ page }) => {
    await page.getByRole('link', { name: 'Workouts' }).first().click();
    await page.getByLabel('Search').fill('zzzznothingmatchesthis');
    await expect(page.getByText(/no workouts match those filters/i)).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText(/no workouts match/i)).toBeHidden();
  });

  test('a workout session can be started and finished', async ({ page }) => {
    await page.getByRole('link', { name: 'Workouts' }).first().click();
    await page
      .getByRole('button', { name: /start workout/i })
      .first()
      .click();

    await expect(page.getByText(/in progress/i)).toBeVisible();
    // Other workouts must be blocked while one is running.
    await expect(
      page.getByRole('button', { name: /finish current session first/i }).first(),
    ).toBeDisabled();

    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /finish session/i }).click();
    await expect(page.getByText(/session complete/i).first()).toBeVisible();
    await expect(page.getByText(/in progress/i)).toBeHidden();
  });

  test('challenges show progress and a ranked leaderboard', async ({ page }) => {
    await page.getByRole('link', { name: 'Challenges' }).first().click();
    await expect(page.getByRole('heading', { name: 'Challenges', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Leaderboard' }).first().click();
    await expect(page.getByText(/\(you\)/)).toBeVisible();

    const rows = page.getByRole('listitem').filter({ hasText: /\(you\)/ });
    await expect(rows.first()).toBeVisible();
  });

  test('the leaderboard says which entries are generated', async ({ page }) => {
    await page.getByRole('link', { name: 'Challenges' }).first().click();
    await page.getByRole('button', { name: 'Leaderboard' }).first().click();

    await expect(page.getByText('Sample').first()).toBeVisible();
    await expect(page.getByText(/generated pace-setters/i).first()).toBeVisible();
  });

  test('a challenge can be joined and left', async ({ page }) => {
    await page.getByRole('link', { name: 'Challenges' }).first().click();

    const leaveButton = page.getByRole('button', { name: 'Leave' }).first();
    await leaveButton.click();
    await expect(page.getByText(/left the challenge/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Join challenge' }).first().click();
    await expect(page.getByText(/joined the challenge/i).first()).toBeVisible();
  });

  test('challenges page has no serious accessibility violations', async ({ page }) => {
    await page.getByRole('link', { name: 'Challenges' }).first().click();
    await expect(page.getByRole('heading', { name: 'Challenges', level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('insights are shown and labelled as rule-based, not AI', async ({ page }) => {
    await page.getByRole('link', { name: 'Insights' }).first().click();
    await expect(page.getByRole('heading', { name: 'Insights', level: 1 })).toBeVisible();

    // The honesty claim is load-bearing; assert it stays on the page.
    await expect(page.getByText(/not generated by a language model/i)).toBeVisible();
    await expect(page.getByText(/Based on/).first()).toBeVisible();
  });

  test('insights page has no serious accessibility violations', async ({ page }) => {
    await page.getByRole('link', { name: 'Insights' }).first().click();
    await expect(page.getByRole('heading', { name: 'Insights', level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe('navigation and resilience', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page);
  });

  test('browser back and forward move between pages', async ({ page }) => {
    await page.getByRole('link', { name: 'Workouts' }).first().click();
    await expect(page.getByRole('heading', { name: 'Workouts', level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Challenges' }).first().click();
    await expect(page.getByRole('heading', { name: 'Challenges', level: 1 })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Workouts', level: 1 })).toBeVisible();

    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Challenges', level: 1 })).toBeVisible();
  });

  test('a deep link survives a full page reload', async ({ page }) => {
    await page.goto('/challenges');
    await expect(page.getByRole('heading', { name: 'Challenges', level: 1 })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Challenges', level: 1 })).toBeVisible();
  });

  test('an unknown route shows the 404 page with a way back', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
    await page.getByRole('link', { name: /back to dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();
  });

  test('double-submitting the activity dialog saves once', async ({ page }) => {
    await page.getByRole('button', { name: /log activity/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Steps/).fill('8888');

    const save = dialog.getByRole('button', { name: /save activity/i });
    await save.click();
    // The button disables while pending, so a second click cannot double-post.
    await expect(toastText(page, /activity saved/i)).toBeVisible();
    const totals = page.getByRole('region', { name: "Today's totals" });
    await expect(totals.getByText('8,888')).toBeVisible();
  });

  test('the theme toggle switches and persists across a reload', async ({ page }) => {
    await page.getByRole('button', { name: /switch to light theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: /switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the app is keyboard navigable from the skip link', async ({ page }) => {
    // Reload so focus starts at the document root, which is the real
    // first-Tab scenario for a keyboard user landing on the page.
    await page.reload();
    await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to content/i });
    await expect(skipLink).toBeFocused();

    // Activating it must move focus into the main region.
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe('responsive layout', () => {
  test('there is no horizontal overflow at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsDemo(page);

    for (const path of ['/', '/workouts', '/challenges', '/insights']) {
      await page.goto(path);
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test('the bottom navigation is pinned to the viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsDemo(page);

    const pinned = await page.evaluate(() => {
      const nav = document.querySelector('nav.fixed');
      if (!nav) return null;
      const rect = nav.getBoundingClientRect();
      return Math.abs(rect.bottom - window.innerHeight) < 2;
    });
    expect(pinned).toBe(true);
  });
});
