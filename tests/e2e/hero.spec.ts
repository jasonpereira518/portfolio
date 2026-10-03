import { expect, test, type Page } from '@playwright/test';

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

  test('moving the pointer over the portrait lays paint on the canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__wash');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await strokeAcrossPortrait(page);
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);
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
