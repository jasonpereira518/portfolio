import { expect, test, type Locator, type Page } from './fixtures';

const PROJECTS = ['Case Closed', 'Orbit', 'StreetLab', 'GPU Portfolio & Risk Decision Engine'];

// Brings a project into view: when the projects slide sideways, by scrolling to the point where it rests; when they
// are stacked, by scrolling to it.
async function reveal(page: Page, index: number): Promise<void> {
  await page.evaluate((i) => {
    const pin = document.querySelector<HTMLElement>('.work__pin')!;
    const panels = document.querySelectorAll('.work__panel');
    if (document.querySelector('#work')!.getAttribute('data-slider') === 'on') {
      const top = pin.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (i / (panels.length - 1)) * (pin.offsetHeight - window.innerHeight));
    } else {
      panels[i].scrollIntoView();
    }
  }, index);
  await expect(page.locator('#work .work__panel').nth(index).getByRole('heading')).toBeInViewport();
}

async function openWork(page: Page): Promise<Locator> {
  await page.goto('/');
  const section = page.locator('#work');
  // Playwright's scrollIntoViewIfNeeded times out on this section (taller than the screen) with reduced motion.
  await section.evaluate((el) => el.scrollIntoView());
  await expect(section).toHaveAttribute('data-enhanced', 'true');
  return section;
}

test.describe('selected work', () => {
  test.beforeEach(async ({ page }) => {
    await openWork(page);
  });

  test('slides sideways through all four projects as the page scrolls', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section).toHaveAttribute('data-slider', 'on');

    for (const [index, title] of PROJECTS.entries()) {
      await reveal(page, index);
      for (const other of PROJECTS.filter((name) => name !== title)) {
        await expect(section.getByRole('heading', { name: other, exact: true })).not.toBeInViewport();
      }
      await expect(section.getByRole('button').nth(index)).toHaveAttribute('aria-current', 'true');
    }
  });

  test('moves in between projects partway through a slide', async ({ page }) => {
    await reveal(page, 0);
    await page.evaluate(() => {
      const pin = document.querySelector<HTMLElement>('.work__pin')!;
      const top = pin.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (pin.offsetHeight - window.innerHeight) / 6); // halfway from the first to the second
    });
    const offset = () => page.locator('#work').evaluate((el) => parseFloat(el.style.getPropertyValue('--offset')));
    await expect.poll(offset).toBeGreaterThan(0.4);
    expect(await offset()).toBeLessThan(0.6);
  });

  test('the section stays on screen while it slides, then scrolls away after the last project', async ({ page }) => {
    const viewport = page.locator('#work .work__viewport');
    await reveal(page, 0);
    await reveal(page, 2);
    expect((await viewport.boundingBox())!.y).toBe(0);

    await reveal(page, 3);
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect.poll(async () => (await viewport.boundingBox())!.y).toBeLessThan(0);

    await page.evaluate(() => window.scrollBy(0, -500));
    await expect.poll(async () => (await viewport.boundingBox())!.y).toBe(0);
    await expect(page.getByRole('heading', { name: PROJECTS[3], exact: true })).toBeInViewport();
  });

  test('the numbered steps jump to a project', async ({ page }) => {
    const section = page.locator('#work');
    await reveal(page, 0);
    await section.getByRole('button', { name: /Orbit/ }).click();
    await expect(section.getByRole('heading', { name: 'Orbit', exact: true })).toBeInViewport();
    await expect(section.getByRole('button', { name: /Orbit/ })).toHaveAttribute('aria-current', 'true');
  });

  test('keyboard focus on a project that is off to the side slides it into view', async ({ page }) => {
    const section = page.locator('#work');
    await reveal(page, 0);
    await section.locator('#panel-streetlab').getByRole('link', { name: 'Read the case study' }).focus();
    await expect(section.getByRole('heading', { name: 'StreetLab', exact: true })).toBeInViewport();
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

  test('every cover loads up front, so none appears late as its project slides in', async ({ page }) => {
    const loading = await page
      .locator('#work .work__stage img')
      .evaluateAll((images) => images.map((image) => image.getAttribute('loading')));
    expect(loading).toEqual(['eager', 'eager', 'eager', 'eager']);
  });

  test('the first project links to its case study, and the section links to all work', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section.getByRole('link', { name: 'Read the case study' }).first()).toHaveAttribute('href', '/work/case-closed');
    await expect(section.getByRole('link', { name: 'All work' })).toHaveAttribute('href', '/work');
  });
});

test.describe('where the projects are stacked instead of sliding', () => {
  test('on a phone all four are in one column, without the step strip', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const section = await openWork(page);
    await expect(section).not.toHaveAttribute('data-slider', 'on');
    await expect(section.getByRole('navigation', { name: 'Selected work' })).toBeHidden();
    const tops = await section.locator('.work__panel').evaluateAll((panels) => panels.map((p) => p.getBoundingClientRect().top));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(4);
  });

  test('with reduced motion the projects stay stacked and nothing slides', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const section = await openWork(page);
    await expect(section).not.toHaveAttribute('data-slider', 'on');
    for (const title of PROJECTS) await expect(section.getByRole('heading', { name: title, exact: true })).toBeVisible();

    // The page's own tiny reduced-motion transitions must not stop the long title settling on its fitted size.
    const long = section.getByRole('heading', { name: PROJECTS[3], exact: true });
    const orbit = await measure(section.getByRole('heading', { name: 'Orbit', exact: true }));
    await expect.poll(async () => (await measure(long)).height).toBeLessThanOrEqual(2 * orbit.lineHeight * orbit.size + 1);
    const settled = await measure(long);
    await page.waitForTimeout(500);
    expect(await measure(long)).toEqual(settled);
  });
});

for (const width of [320, 375, 820, 1024, 1440]) {
  test(`no project title breaks inside a word at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const section = await openWork(page);

    for (const [index, name] of PROJECTS.entries()) {
      await reveal(page, index);
      const overflows = await section
        .locator('.work__title')
        .nth(index)
        .evaluate((title: HTMLElement) => {
          title.style.overflowWrap = 'normal'; // without the safety net, a word that does not fit overflows its column
          return title.scrollWidth > title.parentElement!.clientWidth;
        });
      expect(overflows, `${name} at ${width}px`).toBe(false);
    }
  });
}

test('if the showcase script fails to load, all four projects are shown stacked without the step strip', async ({ page }) => {
  // A stale cached page can point at a hashed chunk that no longer exists; simulate that by aborting it.
  await page.route('**/_astro/showcase.*.js', (route) => route.abort());
  await page.goto('/');
  const section = page.locator('#work');
  await section.scrollIntoViewIfNeeded();

  await expect(section).toHaveAttribute('data-island-failed', 'true');
  await expect(section).not.toHaveAttribute('data-enhanced', 'true');
  await expect(section.getByRole('navigation', { name: 'Selected work' })).toBeHidden();
  for (const name of PROJECTS) {
    await expect(section.getByRole('heading', { name, exact: true })).toBeVisible();
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
    const section = await openWork(page);

    const select = async (index: number, title: string) => {
      await reveal(page, index);
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
  const section = await openWork(page);
  const live: Record<string, string | null> = {
    'Case Closed': 'https://caseclosed.jasonpereira.live',
    Orbit: 'https://orbit.jasonpereira.live',
    StreetLab: null, // no live site yet: only a repo
    'GPU Portfolio & Risk Decision Engine': null,
  };
  for (const [index, [title, href]] of Object.entries(live).entries()) {
    const panel = section.locator('.work__panel').nth(index);
    await expect(panel.getByRole('heading', { name: title, exact: true })).toBeVisible();
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
  const section = await openWork(page);
  for (const [title, colour] of Object.entries(TITLE_COLOURS)) {
    await expect(section.getByRole('heading', { name: title, exact: true })).toHaveCSS('color', colour);
  }
  await page.goto('/work/case-closed');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', TITLE_COLOURS['Case Closed']);
});
