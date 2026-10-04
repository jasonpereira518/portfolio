import { expect, test } from './fixtures';

test.use({ skipIntro: false });

test('the first page of a visit opens with the intro, which then clears to reveal the page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/\bhas-intro\b/);
  await expect(page.locator('.intro')).toBeVisible();
  await expect(page.locator('.intro__mark')).toHaveText('JP');
  await expect(page.locator('.intro')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('html')).not.toHaveClass(/\bhas-intro\b/);
});

test('during the reveal the page shows through a hole that opens in the middle', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const intro = page.locator('.intro');
  await expect(intro).toHaveAttribute('data-phase', 'reveal', { timeout: 3000 });
  // Each reading is one snapshot taken while the intro is still playing, so a later state cannot satisfy it.
  const background = await page.evaluate(() => ({
    playing: document.documentElement.classList.contains('has-intro'),
    colour: getComputedStyle(document.querySelector('.intro')!).backgroundColor,
  }));
  expect(background).toEqual({ playing: true, colour: 'rgba(0, 0, 0, 0)' }); // the canvas now paints the orange

  // Partway through the reveal, the canvas is see-through at its middle and still orange at a far corner.
  // Retried, so a slow machine only needs one such frame before the intro ends.
  const snapshot = () => page.evaluate(() => {
    const element = document.querySelector<HTMLCanvasElement>('.intro__canvas')!;
    const ctx = element.getContext('2d')!;
    // The intro records where it opened the hole, so this test does not repeat its placement rules.
    const [x, y] = element.closest<HTMLElement>('.intro')!.dataset.origin!.split(',').map(Number);
    const scale = element.width / innerWidth;
    const alpha = (px: number, py: number) => ctx.getImageData(Math.round(px * scale), Math.round(py * scale), 1, 1).data[3];
    return {
      playing: document.documentElement.classList.contains('has-intro'),
      centred: Math.abs(x - innerWidth / 2) <= 1 && Math.abs(y - innerHeight / 2) <= 1,
      middle: alpha(x, y),
      corner: alpha(2, 2),
    };
  });
  await expect.poll(snapshot, { intervals: [50] }).toEqual({ playing: true, centred: true, middle: 0, corner: 255 });
});

test('the intro never blocks the page beneath it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('html')).toHaveClass(/\bhas-intro\b/);
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Work' }).click();
  await expect(page).toHaveURL(/\/work\/?$/);
});

test('reloading the page plays the intro again', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/\bhas-intro\b/, { timeout: 5000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/\bhas-intro\b/);
  await expect(page.locator('html')).not.toHaveClass(/\bhas-intro\b/, { timeout: 5000 });
});

test('a page opened out of sight skips the intro instead of stalling in it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // One reading, straight after load: a retried assertion would also pass once a stalled intro timed out.
  expect(await page.evaluate(() => document.documentElement.classList.contains('has-intro'))).toBe(false);
});

test('hiding the page during the intro ends it at once', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/\bhas-intro\b/);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('html')).not.toHaveClass(/\bhas-intro\b/, { timeout: 300 });
});

test('moving between pages does not replay the intro', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.intro')).toBeHidden({ timeout: 5000 });
  await page.goto('/work', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).not.toHaveClass(/\bhas-intro\b/);
  await expect(page.locator('.intro')).toBeHidden();
});

test('with reduced motion there is no intro', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).not.toHaveClass(/\bhas-intro\b/);
  await expect(page.locator('.intro')).toBeHidden();
});

test('if the page script never runs, the intro clears itself', async ({ page }) => {
  await page.route('**/_astro/Base.astro_astro_type_script*', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro')).toBeHidden({ timeout: 6000 });
  // Proves the route really stopped the page script, so the test cannot pass by accident.
  await expect(page.locator('html')).not.toHaveAttribute('data-scripted', 'true');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('there is no intro', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.intro')).toBeHidden();
  });
});

test('the head script leaves the global scope alone', async ({ page }) => {
  await page.goto('/');
  const leaked = await page.evaluate(() => ({
    navigationReplaced: (window as { navigation?: unknown }).navigation instanceof PerformanceNavigationTiming,
    globals: ['entry', 'reloaded', 'seen'].filter((name) => name in window),
  }));
  expect(leaked).toEqual({ navigationReplaced: false, globals: [] });
});
