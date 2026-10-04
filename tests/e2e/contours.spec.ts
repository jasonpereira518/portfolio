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

  // The drift is on the lines layer itself (the sway is on its wrapper), so this reads the drift alone.
  const drift = () => lines.evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0); // "-12.3px -7.7px" or "none"
  const before = await drift();
  await page.waitForTimeout(600);
  expect(await drift()).toBeLessThan(before - 3);
  await expect.poll(() => page.locator('.hero .contours__sway').evaluate((el) => el.getAnimations().length)).toBe(1);
});

// A fractional tile would make the lines hop by a pixel each time the loop restarts.
for (const width of [1024, 1366, 1536]) {
  test(`the contour tile is a whole number of pixels at ${width}px wide, so the loop restarts seamlessly`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const size = await page.locator('.hero .contours__lines').evaluate((el) => {
      const style = getComputedStyle(el);
      return (style.maskSize || style.getPropertyValue('-webkit-mask-size')).split(' ').map(parseFloat);
    });
    expect(size).toHaveLength(2);
    for (const value of size) expect(Number.isInteger(value), `${size}`).toBe(true);
  });
}

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
