import { test, expect } from '@playwright/test';
import { login } from './util';

test('the map search lists the nearest address to the map centre first, not the server fallback point', async ({ page }) => {
  const operationResponse = page.waitForResponse(/api\/operations/);
  await login(page);
  await page.locator('mat-list-item', { hasText: 'e2e test' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('Guest');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await page.waitForSelector('#map', { state: 'visible' });
  await operationResponse;

  await page.locator('.geocoder input').fill('Bahnhofstrasse 15');
  const firstOption = page.locator('mat-option').filter({ hasText: 'Bahnhofstrasse' }).first();
  await expect(firstOption).toBeVisible();
  // the fallback point of the server is Boswil: with the map centre in Bern, Boswil must not come first
  await expect(firstOption).not.toContainText('Boswil');
});
