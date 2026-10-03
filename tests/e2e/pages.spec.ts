import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('the resume page shows every section from the content spec', async ({ page }) => {
  await page.goto('/resume');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jason Pereira');
  const sections = ['Education', 'Experience', 'Projects', 'Skills', 'Certifications', 'Awards and recognition', 'Publication'];
  for (const heading of sections) {
    await expect(page.locator('.resume').getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText('AWS Certified Solutions Architect – Associate')).toBeVisible();
  await expect(page.getByText('Selected for Y Combinator Startup School 2026 (San Francisco, Jul 25–26)')).toBeVisible();
  await expect(page.getByRole('link', { name: /doi\.org/ })).toHaveAttribute(
    'href',
    'https://doi.org/10.63966/teem.v17i1.2265',
  );
});

test('the PDF download is offered only when the file exists', async ({ page }) => {
  await page.goto('/resume');
  const hasPdf = existsSync(join(process.cwd(), 'public', 'jason-pereira-resume.pdf'));
  await expect(page.getByRole('link', { name: 'Download PDF' })).toHaveCount(hasPdf ? 1 : 0);
});

test('unknown addresses get the 404 page with a way home', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('404');
  await expect(page.locator('main').getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/');
});

test('the 404 paint wash is exactly two shapes', async ({ page }) => {
  await page.goto('/404');
  await expect(page.locator('.lost__wash span')).toHaveCount(2);
});

test('the 404 paint wash uses the orange for paper, #F0440F', async ({ page }) => {
  await page.goto('/404');
  for (const shape of await page.locator('.lost__wash span').all()) {
    await expect(shape).toHaveCSS('background-color', 'rgb(240, 68, 15)');
  }
});

for (const width of [375, 1024, 1440]) {
  test(`the 404 page does not scroll sideways at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/404');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}
