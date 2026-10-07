import { expect, test } from './fixtures';

const flagship = [
  { slug: 'case-closed', title: 'Case Closed', next: 'orbit' },
  { slug: 'orbit', title: 'Orbit', next: 'streetlab' },
  { slug: 'streetlab', title: 'StreetLab', next: 'gpu-portfolio-engine' },
  { slug: 'gpu-portfolio-engine', title: 'GPU Portfolio & Risk Decision Engine', next: 'case-closed' },
];

test('the projects index lists all 17 projects in their groups', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Everything I've built.");
  await expect(page.locator('.feature')).toHaveCount(4);
  await expect(page.locator('.card')).toHaveCount(13);
  for (const group of ['Quant and fintech', 'Full-stack and client work', 'Mobile', 'Hackathons', 'Hardware']) {
    await expect(page.getByRole('heading', { name: group, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'CAT-45' })).toBeVisible();
});

test('the projects index opens with a one-line description, and the old /work address still arrives', async ({ page }) => {
  await page.goto('/projects');
  const lede = page.locator('.index__lede');
  await expect(lede).toContainText('AI products');
  expect((await lede.boundingBox())!.height).toBeLessThan(60);
  await page.goto('/work');
  await expect(page).toHaveURL(/\/projects\/?$/);
  await page.goto('/work/orbit');
  await expect(page).toHaveURL(/\/projects\/orbit\/?$/);
});

test('the smaller projects sit two to a row on a wide screen and one to a row on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  const cards = page.locator('.index__cards').first().locator('.card');
  const [first, second] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
  expect(Math.abs(first.y - second.y)).toBeLessThan(2);
  expect(second.x).toBeGreaterThan(first.x + first.width / 2);

  await page.setViewportSize({ width: 390, height: 800 });
  const [phoneFirst, phoneSecond] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
  expect(phoneSecond.y).toBeGreaterThan(phoneFirst.y + phoneFirst.height / 2);
});

test('on the projects index the benchmark chart is shown whole, not cropped', async ({ page }) => {
  await page.goto('/projects');
  const fit = (name: string) =>
    page
      .locator('.feature', { hasText: name })
      .locator('img')
      .evaluate((image) => getComputedStyle(image).objectFit);
  expect(await fit('GPU Portfolio')).toBe('contain');
  expect(await fit('StreetLab')).toBe('cover');
});

test('an award medal sits in the top-right of the project image and its hover card gives the details', async ({ page }) => {
  await page.goto('/projects');
  const feature = page.locator('.feature', { hasText: 'Case Closed' });
  const medal = feature.locator('.medal');
  const tip = medal.locator('.medal__tip');
  await expect(medal).toHaveAttribute('aria-label', /1st Place.*Duke AI Hackathon/);
  await expect(tip).toBeHidden();

  const media = (await feature.locator('.feature__media').boundingBox())!;
  const box = (await medal.boundingBox())!;
  expect(media.x + media.width - (box.x + box.width / 2) < media.width / 4).toBe(true);
  expect(box.y + box.height / 2 - media.y < media.height / 4).toBe(true);

  await medal.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Duke AI Hackathon');
  await expect(tip).toContainText('220+');
  await page.mouse.move(2, 2);
  await expect(tip).toBeHidden();

  await expect(page.locator('.feature', { hasText: 'Orbit' }).locator('.medal')).toHaveCount(0);
});

// These two need real media in the content (a card's `thumb`, a project's `video`). Until some is added they skip.
test('hovering a card thumbnail opens a popup beside the cursor, and leaving closes it', async ({ page }) => {
  await page.goto('/projects');
  const thumb = page.locator('.card__thumb').first();
  test.skip((await thumb.count()) === 0, 'no card has a thumbnail yet');
  await thumb.scrollIntoViewIfNeeded();
  const box = (await thumb.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  const peek = page.locator('.peek');
  await expect(peek).toHaveClass(/is-open/);
  const peekBox = (await peek.boundingBox())!;
  expect(Math.abs(peekBox.x - x) < 700 && peekBox.y + peekBox.height > y).toBe(true);
  await page.mouse.move(2, 2);
  await expect(peek).not.toHaveClass(/is-open/);
});

test('hovering a flagship with a clip plays it, and leaving stops it', async ({ page }) => {
  await page.goto('/projects');
  const feature = page.locator('.feature:has(.feature__video)').first();
  test.skip((await feature.count()) === 0, 'no flagship has a clip yet');
  await feature.hover();
  await expect(feature.locator('.feature__video')).toHaveClass(/is-playing/);
  await page.mouse.move(2, 2);
  await expect(feature.locator('.feature__video')).not.toHaveClass(/is-playing/);
});

test('a case study cover carries alt text that describes the image', async ({ page }) => {
  await page.goto('/projects/gpu-portfolio-engine');
  await expect(page.locator('.case__cover img')).toHaveAttribute('alt', /^Bar chart of QP solve time/);
});

test('a flagship card on the index opens its case study', async ({ page }) => {
  await page.goto('/projects');
  await page.locator('.feature', { hasText: 'Orbit' }).click();
  await expect(page).toHaveURL(/\/projects\/orbit\/?$/);
});

test('with reduced motion, hovering a flagship card does not zoom its image', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects');
  const feature = page.locator('.feature').first();
  await feature.hover();
  // Wait out the 0.6s zoom transition, so a zoom that is merely delayed cannot pass as "none".
  await page.waitForTimeout(800);
  await expect(feature.locator('img')).toHaveCSS('transform', 'none');
});

for (const project of flagship) {
  test(`case study: ${project.title}`, async ({ page }) => {
    await page.goto(`/projects/${project.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.title);
    for (const term of ['Role', 'Year', 'Status', 'Stack', 'Links']) {
      await expect(page.locator('.case__credits dt', { hasText: term })).toHaveCount(1);
    }
    for (const block of ['Problem', 'What I built', 'Result']) {
      await expect(page.locator('.case__blocks').getByRole('heading', { name: block, exact: true })).toBeVisible();
    }
    await expect(page.locator('.case__next')).toHaveAttribute('href', `/projects/${project.next}`);
  });
}
