import { expect, test } from '@playwright/test';

test.describe('selected work', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#work').scrollIntoViewIfNeeded();
    await expect(page.locator('#work')).toHaveAttribute('data-enhanced', 'true');
  });

  test('shows one project at a time and switches on click', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section.getByRole('tab')).toHaveCount(4);
    await expect(section.getByRole('tabpanel')).toHaveCount(1);
    await expect(section.getByRole('heading', { name: 'Case Closed' })).toBeVisible();

    await section.getByRole('tab', { name: /Orbit/ }).click();
    await expect(section.getByRole('heading', { name: 'Orbit' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Case Closed' })).toBeHidden();
  });

  test('arrow keys move between tabs and wrap around', async ({ page }) => {
    const section = page.locator('#work');
    await section.getByRole('tab', { name: /Case Closed/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(section.getByRole('tab', { name: /Orbit/ })).toBeFocused();
    await expect(section.getByRole('tab', { name: /Orbit/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(section.getByRole('tab', { name: /GPU Portfolio Engine/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('arrow keys held with a modifier leave the selected tab alone, so browser shortcuts still work', async ({ page }) => {
    const section = page.locator('#work');
    const first = section.getByRole('tab', { name: /Case Closed/ });
    await first.focus();
    await page.keyboard.press('Alt+ArrowRight');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toBeFocused();
    await expect(section.getByRole('tab', { name: /Orbit/ })).toHaveAttribute('aria-selected', 'false');
  });

  test('the visible project links to its case study, and the section links to all work', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section.getByRole('link', { name: 'Read the case study' })).toHaveAttribute('href', '/work/case-closed');
    await expect(section.getByRole('link', { name: 'All work' })).toHaveAttribute('href', '/work');
  });
});

test('if the showcase script fails to load, all four projects are shown stacked without tabs', async ({ page }) => {
  // A stale cached page can point at a hashed chunk that no longer exists; simulate that by aborting it.
  await page.route('**/_astro/showcase.*.js', (route) => route.abort());
  await page.goto('/');
  const section = page.locator('#work');
  await section.scrollIntoViewIfNeeded();

  await expect(section).toHaveAttribute('data-island-failed', 'true');
  await expect(section).not.toHaveAttribute('data-enhanced', 'true');
  await expect(section.getByRole('tablist')).toBeHidden();
  for (const name of ['Case Closed', 'Orbit', 'StreetLab', 'GPU Portfolio & Risk Decision Engine']) {
    await expect(section.getByRole('heading', { name })).toBeVisible();
  }
});
