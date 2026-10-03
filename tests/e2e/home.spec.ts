import { expect, test } from '@playwright/test';

test('home page shows the name as its only main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Jason Pereira' })).toBeVisible();
});

test('home page sections appear in the designed order', async ({ page }) => {
  await page.goto('/');
  const order = await page
    .locator('main > section, body > footer')
    .evaluateAll((elements) => elements.map((element) => element.classList[0]));
  expect(order).toEqual(['hero', 'statement', 'work', 'numbers', 'xp', 'about', 'footer']);
});

test('the page has a title and a description', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Jason Pereira');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /AI engineer who ships/);
});
