import { test, expect } from '@playwright/test';

test('Home page loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});
