import { expect, test } from '@playwright/test';

test('nav shows the name, the location with a live clock, and four links', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header.nav');
  await expect(nav.getByRole('link', { name: 'Jason Pereira' })).toHaveAttribute('href', '/');
  await expect(nav.getByText('Chapel Hill, NC')).toBeVisible();
  await expect(nav.locator('[data-clock]')).toHaveText(/^\d{2}:\d{2} ET$/);
  const links = nav.getByRole('navigation', { name: 'Primary' }).getByRole('link');
  await expect(links).toHaveText(['Work', 'About', 'Resume', 'Contact']);
});

test('the page script marks the document as scripted', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test('the self-hosted Archivo font loads', async ({ page }) => {
  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const names: string[] = [];
    document.fonts.forEach((font) => {
      if (font.status === 'loaded') names.push(font.family);
    });
    return names;
  });
  expect(loaded.join(' ')).toMatch(/Archivo/);
});
