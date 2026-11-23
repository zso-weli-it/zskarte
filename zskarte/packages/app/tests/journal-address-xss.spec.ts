import { test, expect } from '@playwright/test';
import { login } from './util';

// Regression test: text pasted into the journal editor as an address token must be shown as plain text.
// Before the fix, address-token.blot.ts put the address into innerHTML and the onerror handler ran.
const PAYLOAD = 'addr:(<img src=x onerror="window.__xss=1"><span class="xss-marker">MARKER</span>)';

test.describe('Journal address token XSS', () => {
  test('a pasted address token with HTML is shown as text and does not run', async ({ page }) => {
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

    await page.getByRole('button', { name: 'Add' }).click();
    const modal = page.locator('app-journal-entry-create-modal');
    await modal.waitFor({ state: 'visible' });
    const editor = modal.locator('app-text-area-with-address-search .ql-editor');
    await editor.click();
    // paste the way a user would: a paste event with the text in the clipboard
    await editor.evaluate((element, text) => {
      const data = new DataTransfer();
      data.setData('text/plain', text);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, PAYLOAD);

    await expect(editor).toContainText('MARKER');
    expect(await page.evaluate(() => (window as any).__xss), 'address token payload ran as HTML').toBeUndefined();
    await expect(editor.locator('img[src="x"]')).toHaveCount(0);
  });
});
