import { test, expect } from '@playwright/test';

const WARNING_TEXT = 'Login ist aktuell nicht verfügbar';

test('shows a warning above the login card when organizations cannot be loaded', async ({ page }) => {
  await page.route('**/api/organizations/forlogin', (route) => route.fulfill({ status: 500, body: '{}' }));

  await page.goto('./login');

  await expect(page.getByRole('alert')).toContainText(WARNING_TEXT);
});

test('shows no warning when organizations are loaded', async ({ page }) => {
  await page.route('**/api/organizations/forlogin', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );

  await page.goto('./login');
  await page.getByRole('button', { name: 'Login' }).waitFor();

  await expect(page.getByRole('alert')).toHaveCount(0);
});
