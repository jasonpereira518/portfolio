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

test('the contour lines repeat as tiles and keep moving across the section', async ({ page }) => {
  await page.goto('/');
  const lines = page.locator('.hero .contours__lines');
  const repeat = await lines.evaluate((el) => {
    const style = getComputedStyle(el);
    return style.maskRepeat || style.getPropertyValue('-webkit-mask-repeat');
  });
  expect(repeat).toMatch(/^repeat/);

  const position = () => lines.evaluate((el) => Math.round(el.getBoundingClientRect().x));
  const before = await position();
  await page.waitForTimeout(1000);
  expect(Math.abs((await position()) - before)).toBeGreaterThan(5);
});

test('with reduced motion the contour lines stand still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const lines = page.locator('.hero .contours__lines');
  const position = () =>
    lines.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return [Math.round(box.x), Math.round(box.y)];
    });
  const before = await position();
  await page.waitForTimeout(1000);
  expect(await position()).toEqual(before);
});
