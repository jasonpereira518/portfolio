import { expect, test } from './fixtures';

test('experience lists five roles and two schools', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#experience');
  await expect(section.locator('.xp__list--roles .xp__row')).toHaveCount(5);
  await expect(section.getByRole('heading', { name: 'Amazon Web Services' })).toBeVisible();
  await expect(section.getByText('Solutions Architect Intern')).toBeVisible();
  await expect(section.getByText('Arlington, VA · May–Aug 2026')).toBeVisible();
  await expect(section.locator('.xp__list--schools .xp__row')).toHaveCount(2);
  await expect(section.getByText('Graduating May 2028')).toBeVisible();
  await expect(section.getByRole('link', { name: 'Full resume' })).toHaveAttribute('href', '/resume');
});

test('body text is set in DM Sans and loads it, while the display type stays Archivo', async ({ page }) => {
  await page.goto('/');
  const family = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);
  // Sentences: project and role summaries, the about bio.
  for (const selector of ['.work__summary', '.xp__summary', '.about__bio']) {
    expect(await family(selector), selector).toContain('DM Sans');
  }
  // The wide, uppercase voice: headings, labels, the hero pitch and the project tabs.
  for (const selector of ['.display', '.label', '.hero__pitch', '.work__tab']) {
    expect(await family(selector), selector).toContain('Archivo');
  }
  // The font file is really downloaded and in use, not just named.
  await expect
    .poll(() =>
      page.evaluate(() => [...document.fonts].some((face) => face.family.includes('DM Sans') && face.status === 'loaded')),
    )
    .toBe(true);
});

// Each organisation's name is set in the main colour of its logo.
const ORGS: Record<string, string> = {
  'Amazon Web Services': 'rgb(255, 153, 0)', // #FF9900
  'Carolina Investment Group': 'rgb(35, 48, 100)', // #233064
  Arthmetis: 'rgb(4, 140, 171)', // #048CAB
  'UNC Charlotte, Dept. of Mathematics & Statistics': 'rgb(0, 80, 53)', // #005035
  'Inspirit AI': 'rgb(63, 65, 117)', // #3F4175
};

test('every role has a transparent logo to the left of its name, and the name is in the logo colour', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const rows = page.locator('#experience .xp__list--roles .xp__row');
  await expect(rows).toHaveCount(Object.keys(ORGS).length);
  for (const [org, colour] of Object.entries(ORGS)) {
    const row = rows.filter({ has: page.getByRole('heading', { name: org, exact: true }) });
    const logo = row.locator('.xp__logo');
    const name = row.getByRole('heading', { name: org, exact: true });
    await logo.scrollIntoViewIfNeeded();
    await expect(name, org).toHaveCSS('color', colour);
    await expect(logo, org).toHaveAttribute('alt', ''); // decorative: the name beside it says who it is
    await expect(logo, org).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: org }).toBe(true);

    // To the left of the name, on the same line as it.
    const [logoBox, nameBox] = [await logo.boundingBox(), await name.boundingBox()];
    expect(logoBox!.x + logoBox!.width, org).toBeLessThanOrEqual(nameBox!.x + 1);
    expect(logoBox!.y, org).toBeLessThan(nameBox!.y + nameBox!.height);
    expect(logoBox!.y + logoBox!.height, org).toBeGreaterThan(nameBox!.y);

    // No background: a good share of the image is fully see-through. (A logo's own shape can fill a corner, so
    // this counts pixels rather than checking corners; an image on a solid background has none.)
    const seeThrough = await logo.evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] === 0) clear++;
      return clear / (pixels.length / 4);
    });
    expect(seeThrough, `${org}: the logo has a background`).toBeGreaterThan(0.15);
  }
});

// The logo takes some of the name's width. A name is made smaller to fit; it is never broken inside a word.
for (const width of [375, 820, 1024, 1440]) {
  test(`no organisation name breaks inside a word at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const names = page.locator('#experience .xp__list--roles .xp__org');
    await expect(names).toHaveCount(Object.keys(ORGS).length);
    for (let index = 0; index < Object.keys(ORGS).length; index++) {
      const name = names.nth(index);
      await name.scrollIntoViewIfNeeded();
      // A word too wide for its box would spill out of it sideways rather than wrap.
      await expect.poll(() => name.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), { message: `name ${index}` }).toBe(true);
    }
    // "ARTHMETIS" is one word, so it is one line (fitting made it smaller, not taller).
    const arthmetis = names.filter({ hasText: /^\s*Arthmetis\s*$/ });
    await expect.poll(() => arthmetis.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))).toBeLessThan(1.5);
  });
}

test('about shows the bio, four numbered facts, interests and six collage images', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#about');
  await expect(section.getByRole('heading', { name: "I'm Jason." })).toBeVisible();
  await expect(section.getByText('I co-founded Case Closed')).toBeVisible();
  await expect(section.locator('.about__facts li')).toHaveCount(4);
  await expect(section.locator('.about__facts li').first()).toContainText('Eagle Scout');
  await expect(section.getByText('Hip-hop and playlist curation')).toBeVisible();
  await expect(section.locator('.about__photo img')).toHaveCount(6);
});

test('a collage photo is described by its own alt text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#about .about__photo img').first()).toHaveAttribute('alt', /^Four people/);
});
