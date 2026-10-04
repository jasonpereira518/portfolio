import { devices, expect, test, type Page } from './fixtures';

async function strokeAcrossHero(page: Page) {
  const box = await page.locator('.hero').boundingBox();
  if (!box) throw new Error('The hero has no layout box');
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
  test('shows the pitch, the calls to action, the tags and the stage backdrop', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByText('AI engineer who ships.')).toBeVisible();
    await expect(hero.getByText('Co-founder of Case Closed.')).toBeVisible();
    await expect(hero.getByRole('link', { name: 'See the work' })).toHaveAttribute('href', '#work');
    await expect(hero.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/resume');
    await expect(hero.getByText('Open to Summer 2027 internships')).toBeVisible();
    // The backdrop is decorative: a still, with the looping footage over it.
    await expect(hero.locator('.hero__backdrop img')).toBeVisible();
    await expect(hero.locator('.hero__backdrop')).toHaveAttribute('aria-hidden', 'true');
    const video = hero.locator('.hero__video');
    await expect(video.locator('source')).toHaveAttribute('src', '/hero/stage.mp4');
    expect(await video.evaluate((el: HTMLVideoElement) => [el.muted, el.loop, el.playsInline])).toEqual([true, true, true]);
  });

  test('the backdrop covers the whole hero, under a dark scrim', async ({ page }) => {
    await page.goto('/');
    const hero = (await page.locator('.hero').boundingBox())!;
    const backdrop = (await page.locator('.hero__backdrop').boundingBox())!;
    expect(backdrop).toEqual(hero);
    const scrim = await page.locator('.hero__backdrop').evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
    expect(scrim).toContain('linear-gradient');
  });

  test('the footage is requested with scripts and motion allowed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__video')).toHaveJSProperty('preload', 'auto');
  });

  test('with reduced motion the footage is never fetched, leaving the still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await page.waitForTimeout(400);
    const video = page.locator('.hero__video');
    await expect(video).toHaveJSProperty('preload', 'none');
    await expect(video).toHaveJSProperty('paused', true);
    await expect(video).toHaveCSS('opacity', '0');
    await expect(page.locator('.hero__backdrop img')).toBeVisible();
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

  test('the wordmark is plain paper over the dark backdrop, with no blending', async ({ page }) => {
    await page.goto('/');
    const foot = page.locator('.hero__foot');
    await expect(foot).toHaveCSS('mix-blend-mode', 'normal');
    await expect(page.locator('.hero__wordmark')).toHaveCSS('color', 'rgb(236, 231, 220)');
  });

  test('moving the pointer over the portrait draws an ink line on the canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__ink');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await strokeAcrossHero(page);
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);

    // The ink is the exact orange, #FF5A26: the head of the line is wide enough to hold fully opaque pixels.
    const solid = await canvas.evaluate((el: HTMLCanvasElement) => {
      const context = el.getContext('2d');
      if (!context) return null;
      const pixels = context.getImageData(0, 0, el.width, el.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] === 255) return [pixels[index], pixels[index + 1], pixels[index + 2]];
      }
      return null;
    });
    expect(solid).toEqual([0xff, 0x5a, 0x26]);

    // The ink takes its orange from the hero's theme (the ink theme's orange), not from a hard-coded value.
    const colours = await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      if (!hero) throw new Error('The hero is missing');
      return {
        accent: getComputedStyle(hero).getPropertyValue('--accent').trim(),
        orange: getComputedStyle(document.documentElement).getPropertyValue('--orange').trim(),
      };
    });
    expect(colours.orange).not.toBe('');
    expect(colours.accent).toBe(colours.orange);
  });

  test('the ink line fades away shortly after the pointer stops, leaving the hero clear', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__ink');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await strokeAcrossHero(page);
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);
    // The line lives about 0.8 s. The pointer now rests on the hero, so nothing new is drawn.
    await expect.poll(() => canvas.evaluate(hasPaint), { timeout: 2500 }).toBe(false);
  });

  test('with reduced motion the canvas is never painted', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await strokeAcrossHero(page);
    await page.waitForTimeout(400);
    const canvas = page.locator('.hero__ink');
    await expect(canvas).not.toHaveAttribute('data-ready', 'true');
    expect(await canvas.evaluate(hasPaint)).toBe(false);
  });
});

// `defaultBrowserType` cannot be set inside a describe group (it forces a new worker); the project is Chromium anyway.
const { defaultBrowserType: _browser, ...pixel7 } = devices['Pixel 7'];

test.describe('hero on a touch device', () => {
  test.use(pixel7);

  test('the ambient paint keeps drifting after a swipe on the hero is cancelled', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__ink');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    // With no input at all, a slow stroke paints by itself.
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);

    // A swipe that starts on the hero, then becomes a scroll: one move inside the hero, then a cancel.
    await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      if (!hero) throw new Error('The hero is missing');
      const box = hero.getBoundingClientRect();
      hero.dispatchEvent(
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
