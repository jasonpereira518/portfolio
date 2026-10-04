import { devices, expect, test, type Page } from './fixtures';
import sharp from 'sharp';

async function strokeAcrossPortrait(page: Page) {
  const box = await page.locator('.hero__figure').boundingBox();
  if (!box) throw new Error('The hero portrait has no layout box');
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 15 });
}

const hasPaint = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d');
  if (!context) return false;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) return true;
  return false;
};

test.describe('hero', () => {
  test('shows the pitch, the calls to action, the tags and the portrait', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByText('AI engineer who ships.')).toBeVisible();
    await expect(hero.getByText('Co-founder of Case Closed.')).toBeVisible();
    await expect(hero.getByRole('link', { name: 'See the work' })).toHaveAttribute('href', '#work');
    await expect(hero.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/resume');
    await expect(hero.getByText('Open to Summer 2027 internships')).toBeVisible();
    await expect(hero.getByRole('img', { name: 'Portrait of Jason Pereira' })).toBeVisible();
  });

  test('the wordmark is fitted to the full width of the hero', async ({ page }) => {
    await page.goto('/');
    const wordmark = page.locator('.hero__wordmark');
    await expect(wordmark).toHaveAttribute('style', /--fit:\s*[\d.]+/);
    const ratio = await wordmark.evaluate((el) => {
      const inner = el.firstElementChild;
      return inner ? inner.getBoundingClientRect().width / el.clientWidth : 0;
    });
    expect(ratio).toBeGreaterThan(0.98);
    expect(ratio).toBeLessThan(1.01);
  });

  test('the wordmark renders as exact ink where it sits over the paper', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const wordmark = page.locator('.hero__wordmark');
    await expect
      .poll(() =>
        wordmark.evaluate((el) => {
          const inner = el.firstElementChild;
          return inner ? inner.getBoundingClientRect().width / el.clientWidth : 0;
        }),
      )
      .toBeGreaterThan(0.98);
    const box = await wordmark.boundingBox();
    if (!box) throw new Error('The wordmark has no layout box');

    // The far left of the wordmark (the J and the A) is well clear of the silhouette, so it sits over bare paper.
    const clip = { x: box.x, y: box.y, width: box.width * 0.15, height: box.height };
    const { data, info } = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // The letter fill is the most common dark colour. (The single darkest pixel is not used: where a contour line
    // crosses a letter, difference blending darkens a few pixels below ink.)
    const counts = new Map<string, number>();
    for (let index = 0; index < data.length; index += info.channels) {
      if (data[index] + data[index + 1] + data[index + 2] >= 150) continue;
      const key = `${data[index]},${data[index + 1]},${data[index + 2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const [fill] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['none'];
    const ink = [18, 18, 16];
    const channels = fill.split(',').map(Number);
    expect(channels).toHaveLength(3);
    channels.forEach((channel, index) => expect(Math.abs(channel - ink[index])).toBeLessThanOrEqual(3));
  });

  test('moving the pointer over the portrait lays paint on the canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__wash');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await strokeAcrossPortrait(page);
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);

    // The paint takes its orange from the hero's theme (the paper orange), not from a hard-coded value.
    const colours = await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      if (!hero) throw new Error('The hero is missing');
      return {
        accent: getComputedStyle(hero).getPropertyValue('--accent').trim(),
        orangeDeep: getComputedStyle(document.documentElement).getPropertyValue('--orange-deep').trim(),
      };
    });
    expect(colours.orangeDeep).not.toBe('');
    expect(colours.accent).toBe(colours.orangeDeep);
  });

  test('with reduced motion the canvas is never painted', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await strokeAcrossPortrait(page);
    await page.waitForTimeout(400);
    const canvas = page.locator('.hero__wash');
    await expect(canvas).not.toHaveAttribute('data-ready', 'true');
    expect(await canvas.evaluate(hasPaint)).toBe(false);
  });
});

// `defaultBrowserType` cannot be set inside a describe group (it forces a new worker); the project is Chromium anyway.
const { defaultBrowserType: _browser, ...pixel7 } = devices['Pixel 7'];

test.describe('hero on a touch device', () => {
  test.use(pixel7);

  test('the ambient paint keeps drifting after a swipe on the portrait is cancelled', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__wash');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    // With no input at all, a slow stroke paints by itself.
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);

    // A swipe that starts on the portrait, then becomes a scroll: one move inside the portrait, then a cancel.
    await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      const figure = document.querySelector('.hero__figure');
      if (!hero || !figure) throw new Error('The hero is missing');
      const box = figure.getBoundingClientRect();
      figure.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
        }),
      );
      hero.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    });

    // The drift resumes 2.5 s after the last touch; by 6 s it must be painting again.
    await page.waitForTimeout(6000);
    expect(await canvas.evaluate(hasPaint)).toBe(true);
  });
});

const tiltOf = (page: Page) =>
  page.locator('.hero__figure').evaluate((figure: HTMLElement) => ({
    x: parseFloat(figure.style.getPropertyValue('--tilt-x')) || 0,
    y: parseFloat(figure.style.getPropertyValue('--tilt-y')) || 0,
  }));

test.describe('portrait tilt', () => {
  test('the portrait turns towards the pointer in 3D, and settles back when the pointer leaves', async ({ page }) => {
    await page.goto('/');
    const figure = page.locator('.hero__figure');
    await expect(figure).toHaveAttribute('data-tilt', 'ready');
    const hero = (await page.locator('.hero').boundingBox())!;

    await page.mouse.move(hero.x + hero.width * 0.95, hero.y + hero.height * 0.2);
    await expect.poll(async () => (await tiltOf(page)).y).toBeGreaterThan(5); // turned towards the right
    expect((await tiltOf(page)).x).toBeGreaterThan(1); // and tipped up
    expect(await figure.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^matrix3d/); // with perspective

    await page.mouse.move(hero.x + hero.width * 0.05, hero.y + hero.height * 0.5);
    await expect.poll(async () => (await tiltOf(page)).y).toBeLessThan(-5); // and towards the left

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Work' }).hover(); // off the hero
    await expect.poll(async () => Math.abs((await tiltOf(page)).y)).toBeLessThan(0.05);
  });

  test('the turn pivots on the bottom edge, so the portrait stays on the floor of the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__figure')).toHaveCSS('transform-origin', /^\S+ \S+$/);
    const origin = await page.locator('.hero__figure').evaluate((el) => {
      const [, y] = getComputedStyle(el).transformOrigin.split(' ');
      return { y: parseFloat(y), height: el.getBoundingClientRect().height };
    });
    expect(Math.abs(origin.y - origin.height)).toBeLessThan(2);
  });

  test('with reduced motion the portrait does not turn', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const hero = (await page.locator('.hero').boundingBox())!;
    await page.mouse.move(hero.x + hero.width * 0.95, hero.y + hero.height * 0.2);
    await page.waitForTimeout(400);
    expect(await tiltOf(page)).toEqual({ x: 0, y: 0 });
    await expect(page.locator('.hero__figure')).not.toHaveAttribute('data-tilt', 'ready');
  });
});
