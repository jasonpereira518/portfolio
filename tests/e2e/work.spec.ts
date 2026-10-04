import { expect, test, type Locator } from './fixtures';

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

// Each flagship title is set in the main colour of the project itself (its `color` frontmatter).
const TITLE_COLOURS: Record<string, string> = {
  'Case Closed': 'rgb(184, 128, 95)', // #B8805F
  Orbit: 'rgb(52, 69, 189)', // #3445BD
  StreetLab: 'rgb(18, 191, 211)', // #12BFD3
  'GPU Portfolio & Risk Decision Engine': 'rgb(31, 119, 180)', // #1F77B4
};

// A long project name is made smaller, never allowed to wrap onto more lines and push the layout around.
// At its natural size a title may take two lines; none takes more height than that.
const measure = (heading: Locator) =>
  heading.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      height: el.getBoundingClientRect().height,
      size: parseFloat(style.fontSize),
      lineHeight: parseFloat(style.lineHeight) / parseFloat(style.fontSize), // a ratio, 0.92
    };
  });

// "Orbit" is one short word, so it is never shrunk: its size is the natural size every title starts from.
// A title may take two lines at that size; the long one takes the same height in smaller type.
for (const width of [375, 820, 1024, 1440]) {
  test(`a long project name shrinks to two natural lines of height at ${width}px wide, instead of growing the section`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const section = page.locator('#work');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveAttribute('data-enhanced', 'true');

    const select = async (index: number, title: string) => {
      await section.getByRole('tab').nth(index).click();
      const heading = section.getByRole('heading', { name: title, exact: true });
      await expect(heading).toBeVisible();
      return heading;
    };
    const orbit = await measure(await select(1, 'Orbit'));
    const limit = 2 * orbit.lineHeight * orbit.size + 1; // two lines at the natural size, and a pixel of rounding

    const sizes: Record<string, number> = {};
    for (const [index, title] of Object.keys(TITLE_COLOURS).entries()) {
      const heading = await select(index, title);
      await expect.poll(async () => (await measure(heading)).height, { message: title }).toBeLessThanOrEqual(limit);
      sizes[title] = (await measure(heading)).size;
    }
    expect(sizes.StreetLab).toBeCloseTo(orbit.size, 1); // names that fit keep the natural size
    expect(sizes['GPU Portfolio & Risk Decision Engine']).toBeLessThan(orbit.size);
  });
}

test('on the work index a long project name is smaller rather than taller than two natural lines', async ({ page }) => {
  await page.goto('/work');
  const titles = page.locator('.feature__title');
  await expect(titles).toHaveCount(4);
  const orbit = await measure(titles.filter({ hasText: /^Orbit$/ }));
  const limit = 2 * orbit.lineHeight * orbit.size + 1;
  const long = titles.filter({ hasText: /^GPU/ });
  await expect.poll(async () => (await measure(long)).height).toBeLessThanOrEqual(limit);
  expect((await measure(long)).size).toBeLessThan(orbit.size);
});

test('a project that is online has a "See it live" button next to its case study button', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#work');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute('data-enhanced', 'true');
  const live: Record<string, string | null> = {
    'Case Closed': 'https://caseclosed.jasonpereira.live',
    Orbit: 'https://orbit.jasonpereira.live',
    StreetLab: null, // no live site yet: only a repo
    'GPU Portfolio & Risk Decision Engine': null,
  };
  for (const [index, [title, href]] of Object.entries(live).entries()) {
    await section.getByRole('tab').nth(index).click();
    const panel = section.getByRole('tabpanel').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(panel.getByRole('link', { name: 'Read the case study' })).toBeVisible();
    const button = panel.getByRole('link', { name: 'See it live' });
    if (href) {
      await expect(button).toHaveAttribute('href', href);
      await expect(button).toHaveAttribute('target', '_blank');
      await expect(button).toHaveAttribute('rel', /noopener/);
    } else {
      await expect(button).toHaveCount(0);
    }
  }
});

test('each project title on the work index is in its project colour', async ({ page }) => {
  await page.goto('/work');
  for (const [title, colour] of Object.entries(TITLE_COLOURS)) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCSS('color', colour);
  }
});

test('each selected-work title and case study heading is in its project colour', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#work');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute('data-enhanced', 'true');
  for (const [title, colour] of Object.entries(TITLE_COLOURS)) {
    await section.getByRole('tab', { name: new RegExp(title.split(' ')[0]) }).click();
    await expect(section.getByRole('heading', { name: title, exact: true })).toHaveCSS('color', colour);
  }
  await page.goto('/work/case-closed');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', TITLE_COLOURS['Case Closed']);
});
