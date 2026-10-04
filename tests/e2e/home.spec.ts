import { expect, test } from '@playwright/test';
import sharp from 'sharp';

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

test('every page names a 1200×630 share image that exists', async ({ page, request }) => {
  for (const path of ['/', '/work', '/work/streetlab', '/resume']) {
    await page.goto(path);
    const image = page.locator('meta[property="og:image"]');
    await expect(image).toHaveAttribute('content', 'https://jasonpereira.live/og.jpg');
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
  // The meta tag points at the live domain; check the same file on this server.
  const response = await request.get('/og.jpg');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/jpeg');
  const { width, height } = await sharp(await response.body()).metadata();
  expect({ width, height }).toEqual({ width: 1200, height: 630 });
});

test('the page has a title and a description', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Jason Pereira');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /AI engineer who ships/);
});
