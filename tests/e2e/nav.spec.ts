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

test('the nav text is paper plus ink, so difference blending shows exact ink over paper and exact paper over ink', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header.nav')).toHaveCSS('color', 'rgb(254, 249, 236)');
});

test('the page script marks the document as scripted', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test('the self-hosted Archivo font loads', async ({ page }) => {
  // Registered before goto so the font request cannot be missed.
  const fontResponse = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('.woff2'));
  await page.goto('/');

  // The woff2 comes from this site's own origin, not a third-party font host.
  const response = await fontResponse;
  expect(new URL(response.url()).origin).toBe(new URL(page.url()).origin);
  expect(response.ok()).toBe(true);

  // The generated Archivo face itself is loaded. The local Arial fallback face is named
  // "Archivo-<hash> fallback: Arial" and can report loaded on its own, so it must not match.
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const names: string[] = [];
    document.fonts.forEach((font) => {
      if (font.status === 'loaded') names.push(font.family);
    });
    return names;
  });
  expect(loaded).toContainEqual(expect.stringMatching(/^Archivo-[0-9a-f]+$/));
});
