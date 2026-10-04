import { expect, test } from './fixtures';

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

  test('every cover has alt text that describes the image, not a generic label', async ({ page }) => {
    const alts = await page
      .locator('#work .work__stage img')
      .evaluateAll((images) => images.map((image) => image.getAttribute('alt') ?? ''));
    expect(alts).toHaveLength(4);
    for (const alt of alts) {
      expect(alt.length, alt).toBeGreaterThan(40);
      expect(alt).not.toMatch(/screenshot\.?$/i);
    }
    expect(new Set(alts).size).toBe(4);
  });

  test('the benchmark chart is shown whole, while screenshots fill their frame', async ({ page }) => {
    const fit = (panel: string) =>
      page.locator(`#${panel} .work__stage img`).evaluate((image) => getComputedStyle(image).objectFit);
    expect(await fit('panel-gpu-portfolio-engine')).toBe('contain');
    expect(await fit('panel-streetlab')).toBe('cover');
  });

  test('the covers of projects that are not shown are not downloaded up front', async ({ page }) => {
    // The page is marked as scripted before first paint, so the hidden panels are never laid out
    // and their lazy covers are never requested.
    const loaded = await page
      .locator('#work .work__panel[hidden] .work__stage img')
      .evaluateAll((images: HTMLImageElement[]) => images.map((image) => image.complete && image.naturalWidth > 0));
    expect(loaded).toEqual([false, false, false]);
  });

  test('pointing at a tab starts loading its cover before the project is shown', async ({ page }) => {
    const section = page.locator('#work');
    const cover = section.locator('#panel-orbit .work__stage img');
    await expect(cover).toHaveAttribute('loading', 'lazy');
    await section.getByRole('tab', { name: /Orbit/ }).hover();
    await expect(cover).toHaveAttribute('loading', 'eager');
    await expect
      .poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
      .toBe(true);
    await expect(section.getByRole('heading', { name: 'Orbit' })).toBeHidden();
  });

  test('the visible project links to its case study, and the section links to all work', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section.getByRole('link', { name: 'Read the case study' })).toHaveAttribute('href', '/work/case-closed');
    await expect(section.getByRole('link', { name: 'All work' })).toHaveAttribute('href', '/work');
  });
});

for (const width of [320, 375, 820, 1024, 1440]) {
  test(`no project title breaks inside a word at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const section = page.locator('#work');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveAttribute('data-enhanced', 'true');

    for (const name of [/Case Closed/, /Orbit/, /StreetLab/, /GPU Portfolio Engine/]) {
      await section.getByRole('tab', { name }).click();
      const overflows = await section
        .locator('.work__panel:not([hidden]) .work__title')
        .evaluate((title: HTMLElement) => {
          title.style.overflowWrap = 'normal'; // without the safety net, a word that does not fit overflows its column
          return title.scrollWidth > title.parentElement!.clientWidth;
        });
      expect(overflows, `${name} at ${width}px`).toBe(false);
    }
  });
}

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
