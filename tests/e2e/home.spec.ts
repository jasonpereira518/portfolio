import { expect, test } from '@playwright/test';

test('home page shows the name as the main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Jason Pereira' })).toBeVisible();
});
