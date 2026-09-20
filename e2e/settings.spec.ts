import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signInAsDemo, toastText, watchForErrors } from './helpers';

/** A CSV whose dates end today, so the dashboard can be asserted against it. */
function writeCsv(days: number, startSteps: number): string {
  const rows = ['date,steps,calories,active minutes,minutes asleep,water ml'];
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    rows.push([iso, startSteps + i * 111, 600 + i * 10, 50 + i, 450, 2300].join(','));
  }

  const path = join(mkdtempSync(join(tmpdir(), 'hhp-')), 'activity.csv');
  writeFileSync(path, rows.join('\n'));
  return path;
}

async function registerFresh(page: Parameters<typeof signInAsDemo>[0]): Promise<void> {
  const username = `e2e${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await page.goto('/register');
  await page.getByLabel('First name').fill('Fresh');
  await page.getByLabel('Last name').fill('User');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(`${username}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('heading', { name: /hello, fresh/i })).toBeVisible();
}

test.describe('settings', () => {
  test('is reachable from the account menu', async ({ page }) => {
    await signInAsDemo(page);
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('menuitem', { name: /settings/i }).click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('a goal can be changed and it sticks', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    // Save only enables on a real change, and the demo account is shared across
    // projects, so the new value has to be derived from what is stored now.
    const steps = page.getByLabel(/Daily steps/);
    const target = String(Number(await steps.inputValue()) + 100);

    await steps.fill(target);
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect(toastText(page, /daily steps updated/i)).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/Daily steps/)).toHaveValue(target);
  });

  test('a profile field can be changed and it sticks', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    const height = page.getByLabel('Height');
    const target = String(Number((await height.inputValue()) || '175') + 1);

    await height.fill(target);
    await page.getByRole('button', { name: /save profile/i }).click();
    await expect(toastText(page, /profile saved/i)).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Height')).toHaveValue(target);
  });
});

test.describe('import', () => {
  test('previews a CSV before writing anything', async ({ page }) => {
    const { errors } = watchForErrors(page);
    await signInAsDemo(page);
    await page.goto('/settings');

    await page.locator('input[type=file]').setInputFiles(writeCsv(7, 12_000));

    await expect(page.getByText('7 days ready to import')).toBeVisible();
    await expect(page.getByText(/Steps, Calories, Active minutes, Sleep, Water/)).toBeVisible();
    // Nothing is written until the button is pressed.
    await expect(page.getByRole('button', { name: /^Import 7 days$/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('merge refuses to overwrite days that already have data', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    await page.locator('input[type=file]').setInputFiles(writeCsv(7, 12_000));
    await expect(page.getByText('7 days ready to import')).toBeVisible();
    await page.getByRole('button', { name: /^Import 7 days$/ }).click();

    // The demo account is seeded for these days, so every one is left alone.
    await expect(toastText(page, /0 days added, 0 updated, 7 unchanged/)).toBeVisible();
  });

  test('overwrite replaces those days and the dashboard follows', async ({ page }) => {
    await registerFresh(page);
    await page.goto('/settings');

    // Give the account something to replace, so "updated" is the real outcome
    // rather than a side effect of whatever ran before this test.
    await page.locator('input[type=file]').setInputFiles(writeCsv(7, 8_000));
    await expect(page.getByText('7 days ready to import')).toBeVisible();
    await page.getByRole('button', { name: /^Import 7 days$/ }).click();
    await expect(toastText(page, /7 days added/)).toBeVisible();

    await page.locator('input[type=file]').setInputFiles(writeCsv(7, 11_000));
    await expect(page.getByText('7 days ready to import')).toBeVisible();

    await page.getByRole('radio', { name: /replace with the file/i }).check();
    await expect(page.getByText(/This replaces existing values/)).toBeVisible();

    await page.getByRole('button', { name: /^Import 7 days$/ }).click();
    await expect(toastText(page, /7 updated/)).toBeVisible();

    await page.goto('/');
    await expect(
      page.getByRole('region', { name: "Today's totals" }).getByText('11,000'),
    ).toBeVisible();
  });

  test('a fresh account imports the full history', async ({ page }) => {
    await registerFresh(page);
    await page.goto('/settings');

    await page.locator('input[type=file]').setInputFiles(writeCsv(7, 9_500));
    await expect(page.getByText('7 days ready to import')).toBeVisible();
    await page.getByRole('button', { name: /^Import 7 days$/ }).click();

    await expect(toastText(page, /7 days added/)).toBeVisible();

    await page.goto('/');
    await expect(
      page.getByRole('region', { name: "Today's totals" }).getByText('9,500'),
    ).toBeVisible();
  });

  test('explains itself when the file has no usable columns', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    const path = join(mkdtempSync(join(tmpdir(), 'hhp-bad-')), 'nope.csv');
    writeFileSync(path, 'colour,mood\nblue,fine');
    await page.locator('input[type=file]').setInputFiles(path);

    await expect(page.getByText(/No date column/)).toBeVisible();
    await expect(page.getByRole('button', { name: /try another file/i })).toBeVisible();
  });

  test('rejects an unsupported file type', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    const path = join(mkdtempSync(join(tmpdir(), 'hhp-img-')), 'photo.png');
    writeFileSync(path, 'not really a png');
    await page.locator('input[type=file]').setInputFiles(path);

    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  });

  test('cancel discards the preview without importing', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    await page.locator('input[type=file]').setInputFiles(writeCsv(3, 5_000));
    await expect(page.getByText('3 days ready to import')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('3 days ready to import')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Choose a file' })).toBeVisible();
  });
});

test.describe('export', () => {
  test('downloads JSON containing the account data', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: /download json/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^healthhubpro-export-\d{4}-\d{2}-\d{2}\.json$/);

    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString());

    expect(body.profile.username).toBe('demo');
    expect(body.goals).toHaveLength(5);
    expect(body.activity.length).toBeGreaterThan(0);
    // The export must never carry credentials.
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  test('downloads CSV with a header row', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/settings');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: /download csv/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString();

    expect(text.split('\n')[0]).toBe('date,steps,calories,activeMinutes,sleepHours,waterLiters');
  });
});
