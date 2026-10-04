import { expect, test } from './fixtures';

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

  test('no stacked project title breaks inside a word', async ({ page }) => {
    await page.goto('/');
    const overflowing = await page.locator('#work .work__title').evaluateAll((titles: HTMLElement[]) =>
      titles
        .filter((title) => {
          title.style.overflowWrap = 'normal'; // without the safety net, a word that does not fit overflows its column
          return title.scrollWidth > title.parentElement!.clientWidth;
        })
        .map((title) => title.textContent),
    );
    expect(overflowing).toEqual([]);
  });
});

test('if the page script fails to load, the page goes back to its no-script layout', async ({ page }) => {
  await page.route('**/_astro/Base.astro_astro_type_script*', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
  for (const title of ['Case Closed', 'Orbit', 'StreetLab', 'GPU Portfolio & Risk Decision Engine']) {
    await expect(page.locator('#work').getByRole('heading', { name: title })).toBeVisible();
  }
  await expect(page.locator('#work [role="tablist"]')).toBeHidden();
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

test.describe('reduced motion', () => {
  test('the home page is static and nothing is hidden waiting for a reveal', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (/\/_astro\/[^?]*\.js/.test(request.url())) scripts.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await page.waitForTimeout(500);

    // Nothing below scrolls the page first: content must already be visible, not waiting for a reveal.
    // The assertions are soft so one run lists every one that fails.

    // 1. Smooth scrolling never loads or starts.
    const smoothRequests = scripts.filter((url) => /\/_astro\/smooth\./.test(url));
    expect.soft(smoothRequests, 'requests for the smooth-scrolling chunk').toEqual([]);
    await expect.soft(page.locator('html')).not.toHaveClass(/\blenis\b/);

    // 2. The marquee does not animate.
    await expect.soft(page.locator('.marquee__track')).toHaveCSS('animation-name', 'none');

    // 3. Nothing is dimmed or hidden until a scroll reveal runs.
    const revealOpacities = await page
      .locator('[data-reveal]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(revealOpacities.length, 'there are [data-reveal] elements to check').toBeGreaterThan(0);
    expect.soft(
      revealOpacities.filter((opacity) => opacity !== '1').length,
      `[data-reveal] elements not fully opaque, of ${revealOpacities.length}: ${revealOpacities.join(', ')}`,
    ).toBe(0);
    const wordOpacities = await page
      .locator('.statement__word')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(wordOpacities.length, 'there are statement words to check').toBeGreaterThan(0);
    expect.soft(
      wordOpacities.filter((opacity) => opacity !== '1').length,
      `statement words not fully opaque, of ${wordOpacities.length}: ${wordOpacities.join(', ')}`,
    ).toBe(0);

    // 5. The hero canvas is not painted. The hero script was loaded, so the missing flag is the
    // reduced-motion guard at work and not a script that never ran.
    expect.soft(
      scripts.some((url) => /\/_astro\/hero-wash\./.test(url)),
      'the hero script was loaded',
    ).toBe(true);
    await expect.soft(page.locator('.hero__wash')).not.toHaveAttribute('data-ready', 'true');

    // 4. Numerals show their final text without counting. This one scrolls each numeral into view
    // (after the checks above) so the count-up would have run if it were going to.
    const numerals = page.locator('.numbers__numeral');
    for (const numeral of await numerals.all()) await numeral.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // longer than the 1.4 s count-up
    const shown = await numerals.evaluateAll((els) =>
      els.map((el) => ({
        text: el.textContent?.trim() ?? '',
        count: el.getAttribute('data-count') ?? '',
        counted: el.hasAttribute('data-counted'),
      })),
    );
    expect(shown.length, 'there are numerals to check').toBeGreaterThan(0);
    expect.soft(shown.filter((n) => n.text !== n.count), 'numerals whose text differs from data-count').toEqual([]);
    expect.soft(shown.filter((n) => n.counted), 'numerals that counted up').toEqual([]);
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
