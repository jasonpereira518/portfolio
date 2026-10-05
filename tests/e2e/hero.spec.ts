import { expect, test } from './fixtures';

test.describe('hero', () => {
  test('shows the pitch, the calls to action, the tags and the stage backdrop', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByText('AI engineer who ships.')).toBeVisible();
    await expect(hero.getByText('Co-founder of Case Closed.')).toBeVisible();
    await expect(hero.getByRole('link', { name: 'See the work' })).toHaveAttribute('href', '#work');
    await expect(hero.getByRole('link', { name: 'Achievements' })).toHaveAttribute('href', '/achievements');
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

  test('there is no cursor painting: the hero holds no drawing canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero canvas')).toHaveCount(0);
  });
});
