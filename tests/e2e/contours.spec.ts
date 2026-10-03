import { expect, test } from '@playwright/test';

test('the contour artwork is served as an SVG image', async ({ request }) => {
  const response = await request.get('/contours.svg');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  expect(await response.text()).toContain('<path ');
});

test('a section can show the contour lines behind its content', async ({ page }) => {
  await page.goto('/');
  const mask = await page
    .locator('.contours__lines')
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return style.maskImage || style.getPropertyValue('-webkit-mask-image');
    });
  expect(mask).toContain('contours.svg');
});
