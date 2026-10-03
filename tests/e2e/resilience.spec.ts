import { expect, test } from '@playwright/test';

const pages = ['/', '/work', '/work/case-closed', '/resume', '/404'];

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the home page content is all readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Jason Pereira' })).toBeVisible();
    await expect(page.getByText('I build AI systems that')).toBeVisible();
    for (const title of ['Case Closed', 'Orbit', 'StreetLab', 'GPU Portfolio & Risk Decision Engine']) {
      await expect(page.locator('#work').getByRole('heading', { name: title })).toBeVisible();
    }
    await expect(page.locator('#work [role="tablist"]')).toBeHidden();
    await expect(page.locator('.numbers__numeral').first()).toHaveText('220+');
    await expect(page.getByRole('link', { name: 'jasonpereira518@gmail.com' })).toBeVisible();
  });
});

test.describe('layout', () => {
  for (const width of [320, 375, 768, 1440]) {
    test(`no page scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await page.goto(path);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} is ${overflow}px wider than the viewport`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('smooth scrolling', () => {
  test('starts for mouse users', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  });

  test('stays off under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await page.waitForTimeout(500);
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
  });
});

test('the first Tab stop is the skip link', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});

test('every internal link on every page resolves', async ({ page, request }) => {
  const targets = new Set<string>();
  for (const path of pages.filter((candidate) => candidate !== '/404')) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    for (const href of hrefs) targets.add(href.split('#')[0] || '/');
  }
  expect(targets.size).toBeGreaterThan(5);
  for (const target of targets) {
    const response = await request.get(target);
    expect(response.status(), `${target} returned ${response.status()}`).toBe(200);
  }
});
