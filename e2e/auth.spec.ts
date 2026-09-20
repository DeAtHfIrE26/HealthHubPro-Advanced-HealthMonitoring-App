import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, signInAsDemo, watchForErrors } from './helpers';

test.describe('authentication', () => {
  test('a stranger can reach a populated app in one click', async ({ page }) => {
    const { errors, failures } = watchForErrors(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    // The whole demo promise: credentials visible, no signup required.
    await expect(page.getByText(/demo1234/)).toBeVisible();

    await page.getByRole('button', { name: /try the demo/i }).click();
    await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();

    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });

  test('the login page has no serious accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await expectNoA11yViolations(page);
  });

  test('manual sign-in with the published demo credentials works', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('demo');
    await page.getByLabel('Password').fill('demo1234');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();
  });

  test('a wrong password shows an inline error and stays on the page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('demo');
    await page.getByLabel('Password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(/incorrect username or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('registration validates inline and then signs the user in', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('Person');
    await page.getByLabel('Username').fill('ab');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    const unique = `e2e${Date.now().toString(36)}`;
    await page.getByLabel('Username').fill(unique);
    await page.getByLabel('Email').fill(`${unique}@example.com`);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByRole('heading', { name: /hello, test/i })).toBeVisible();
  });

  test('signing out returns to login and protects the dashboard', async ({ page }) => {
    await signInAsDemo(page);
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a signed-in user is redirected away from the login page', async ({ page }) => {
    await signInAsDemo(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /hello, demo/i })).toBeVisible();
  });
});
