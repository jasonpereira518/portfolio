import { expect, test } from './fixtures';

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

test.describe('with scripts', () => {
  test('the contour lines are redrawn as they change shape', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('.hero .contours');
    await expect(root).toHaveAttribute('data-live', 'true');
    const canvas = root.locator('canvas');
    await expect(canvas).toHaveCount(1);
    const snapshot = () => canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    const blank = await page.evaluate(() => {
      const empty = document.createElement('canvas');
      const live = document.querySelector<HTMLCanvasElement>('.hero .contours canvas')!;
      empty.width = live.width;
      empty.height = live.height;
      return empty.toDataURL();
    });
    const first = await snapshot();
    expect(first).not.toBe(blank); // lines were drawn
    await page.waitForTimeout(700);
    expect(await snapshot()).not.toBe(first); // and they moved
  });

  test('the live lines are redrawn at once when the section changes size, so they never blink out', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .contours')).toHaveAttribute('data-live', 'true');
    await page.setViewportSize({ width: 1100, height: 760 });
    // Read the canvas in the same task that the resize is handled in, before any later frame can redraw it.
    const blankAfterResize = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const root = document.querySelector<HTMLElement>('.hero .contours')!;
          new ResizeObserver(() => {
            const canvas = root.querySelector('canvas')!;
            const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
            let drawn = false;
            for (let index = 3; index < pixels.length; index += 4) if (pixels[index] !== 0) { drawn = true; break; }
            resolve(!drawn);
          }).observe(root);
          root.style.height = `${root.getBoundingClientRect().height - 40}px`;
        }),
    );
    expect(blankAfterResize).toBe(false);
  });

  test('once the live lines are drawn, the static artwork is hidden and stops moving', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .contours')).toHaveAttribute('data-live', 'true');
    await expect(page.locator('.hero .contours__sway')).toBeHidden();
  });

  test('with reduced motion no live lines are drawn', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page.locator('.contours canvas')).toHaveCount(0);
    await expect(page.locator('.contours[data-live]')).toHaveCount(0);
  });
});

// Without scripts (and before they start) the static artwork drifts with CSS alone.
test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

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
