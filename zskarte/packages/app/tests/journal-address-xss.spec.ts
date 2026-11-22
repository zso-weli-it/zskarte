import { test, expect, Page } from '@playwright/test';
import { login } from './util';

// Regression test: text inside an address token must be shown as plain text in the journal editor.
// Before the fix, address-token.blot.ts put the raw address into innerHTML and the onerror handler ran.
//
// The editor for stored text is only shown for entries with status "awaiting_message" (they open in the
// create dialog), so the test creates such an entry: the POST body is changed to carry the payload.
const PAYLOAD = 'addr:(<img src=x onerror="window.__xss=1"><span class="xss-marker">MARKER</span>)';
const SUBJECT = 'XSS-Test';

async function addEntry(page: Page) {
  const rowCount = await page.locator('tbody').getByRole('row').count();
  await page.getByRole('button', { name: 'Add' }).click();
  const modal = page.locator('app-journal-entry-create-modal');
  await modal.waitFor({ state: 'visible' });
  await modal.getByLabel('Absender').fill('Absender');
  await modal.getByLabel('Empfänger').fill('Empfänger');
  await modal.getByLabel('Zeit').fill('12:00');
  await modal.getByTestId('communicationDevice').click();
  await modal.getByRole('option', { name: 'E-Mail' }).click();
  await modal.getByLabel('Nummer / Kanal').fill('testtest');
  await modal.getByLabel('Betreff').fill(SUBJECT);
  await modal.locator('app-text-area-with-address-search .ql-container').click();
  await modal.locator('app-text-area-with-address-search .ql-editor').fill('Inhalt');
  await modal.getByLabel('Visum').fill('test');
  await page.waitForTimeout(500);
  await modal.getByRole('button', { name: 'Erfassen' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(rowCount + 1);
  await modal.getByRole('button', { name: 'Schliessen' }).click();
  await expect(modal).not.toBeVisible();
}

test.describe('Journal address token XSS', () => {
  test.beforeEach(async ({ page }) => {
    const journalEntriesResponse = page.waitForResponse(/api\/journal-entries/);
    await login(page);
    await page.locator('mat-list-item', { hasText: 'e2e test' }).first().click();
    const nameDialog = page.getByRole('dialog');
    await nameDialog.getByRole('textbox').fill('Guest');
    await nameDialog.getByRole('button', { name: 'OK' }).click();
    await page.waitForSelector('#map', { state: 'visible' });
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Journal' }).click();
    await journalEntriesResponse;
  });

  test('payload in an address token is not executed when the entry is opened in the editor', async ({ page }) => {
    // store the entry as "awaiting_message" with the payload as its text
    await page.route(/\/api\/journal-entries(\?|$)/, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const body = route.request().postDataJSON();
      body.data.messageContent = PAYLOAD;
      body.data.entryStatus = 'awaiting_message';
      await route.continue({ postData: JSON.stringify(body) });
    });
    await addEntry(page);

    await page.locator('tbody tr').filter({ hasText: SUBJECT }).first().click();

    // the editor with the stored text is open; the marker is visible as text in both the safe and the unsafe case
    await expect(page.locator('app-text-area-with-address-search .ql-editor').first()).toContainText('MARKER');

    const executed = await page.evaluate(() => (window as any).__xss === 1);
    expect(executed, 'address token payload ran as HTML').toBe(false);
    await expect(page.locator('app-text-area-with-address-search .ql-editor img[src="x"]')).toHaveCount(0);
  });
});
