import { expect, test, type Page } from './fixtures';

const scroller = (page: Page) => page.locator('.gallery__scroller');
const scrollLeft = (page: Page) => scroller(page).evaluate((el) => el.scrollLeft);
const realTiles = (page: Page) => page.locator('.gallery__track:not(.gallery__track--copy) a[data-index]');
// The gallery script loads just after the page; until then a click opens the image file itself (the no-script
// fallback). Tests that use the lightbox, wheel or zoom wait for it.
const ready = (page: Page) => expect(page.locator('.gallery')).toHaveAttribute('data-drifting', 'true');

test('the gallery shows all 20 photos, Quick Sprint first, each with a description', async ({ page }) => {
  await page.goto('/gallery');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gallery');
  await expect(page.getByText('See a few of my accolades')).toBeVisible();
  await expect(realTiles(page)).toHaveCount(20);
  await expect(realTiles(page).nth(0)).toHaveAttribute('id', 'aws-quick-sprint');
  await expect(realTiles(page).nth(1)).toHaveAttribute('id', 'tedxunc');
  await expect(realTiles(page).nth(2)).toHaveAttribute('id', 'good-citizenship');
  const alts = await realTiles(page).locator('img').evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).alt));
  for (const alt of alts) expect(alt.length).toBeGreaterThan(10);
  // The loop's repeats are hidden from assistive tech and the keyboard.
  await expect(page.locator('.gallery__track--copy')).toHaveCount(2);
  for (const copy of await page.locator('.gallery__track--copy').all()) await expect(copy).toHaveAttribute('aria-hidden', 'true');
});

test('the wall is loose but tidy: two sizes of photo, each its own shape, none overlapping', async ({ page }) => {
  await page.goto('/gallery');
  // Layout boxes (offset*, which ignore the slight tilt and the zoom), in the real copy of the wall.
  const boxes = await page.locator('.gallery__track:not(.gallery__track--copy) .gallery__tile').evaluateAll((tiles) =>
    tiles.map((li) => {
      const el = li as HTMLElement;
      const img = el.querySelector('img')!;
      return {
        feature: el.hasAttribute('data-feature'),
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
        shape: Number(img.getAttribute('width')) / Number(img.getAttribute('height')),
      };
    }),
  );
  expect(boxes).toHaveLength(20);
  const half = boxes.find((box) => !box.feature)!.h;
  for (const box of boxes) {
    // Two sizes only: a feature is the wall's full height, every other photo half of it.
    expect(Math.abs(box.h - (box.feature ? half * 2.07 : half))).toBeLessThanOrEqual(1.5);
    // Shown at its own shape, not cropped to fit a grid.
    expect(Math.abs(box.w / box.h - box.shape)).toBeLessThan(0.03);
  }
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
      expect(overlap, JSON.stringify([a, b])).toBe(false);
    }
  }
  // Loose: the photos do not all sit on the same lines.
  expect(new Set(boxes.map((box) => box.y)).size).toBeGreaterThan(4);
});

test('photos and links on the wall cannot be dragged out of the page', async ({ page }) => {
  await page.goto('/gallery');
  const draggable = await page
    .locator('.gallery__scroller a, .gallery__scroller img')
    .evaluateAll((els) => els.filter((el) => (el as HTMLElement).draggable).length);
  expect(draggable).toBe(0);
});

test('clicking a photo opens it in the lightbox; arrows move through photos and Escape closes it', async ({ page }) => {
  await page.goto('/gallery');
  await ready(page);
  const dialog = page.locator('.gallery__box');
  const caption = dialog.locator('.gallery__box-caption');
  await page.locator('#tedxunc').click();
  await expect(dialog).toBeVisible();
  await expect(caption).toContainText('TEDxUNC');
  await page.keyboard.press('ArrowRight');
  await expect(caption).toContainText('Marine Corps League');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(caption).toContainText('Quick Sprint');
  await page.keyboard.press('ArrowLeft'); // wraps round to the last photo
  await expect(caption).toContainText('#HomeForEveryPet');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('a link to /gallery#<id> opens straight to that photo', async ({ page }) => {
  await page.goto('/gallery#duke-hackathon');
  await expect(page.locator('.gallery__box')).toBeVisible();
  await expect(page.locator('.gallery__box-caption')).toContainText('Duke AI Hackathon');
  await expect(page.locator('.gallery__box-link')).toHaveAttribute('href', '/work/case-closed');
});

test('the wall drifts on its own and stops while the pointer is over it', async ({ page }) => {
  await page.goto('/gallery');
  await page.mouse.move(5, 5);
  const start = await scrollLeft(page);
  await expect.poll(async () => (await scrollLeft(page)) - start, { timeout: 5000 }).toBeGreaterThan(10);
  await scroller(page).hover();
  await expect(scroller(page)).toHaveAttribute('data-paused', /hover/);
  await page.waitForTimeout(500); // it eases to a stop rather than halting dead
  const held = await scrollLeft(page);
  await page.waitForTimeout(600);
  expect(Math.abs((await scrollLeft(page)) - held)).toBeLessThanOrEqual(1);
});

test('scrolling down over the wall scrolls the page past the gallery', async ({ page }) => {
  await page.goto('/gallery');
  await ready(page);
  await page.locator('#tedxunc').hover();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
});

test('a sideways swipe or Shift + wheel moves the wall forwards and backwards, past its first photo', async ({ page }) => {
  await page.goto('/gallery');
  await ready(page);
  await page.locator('#tedxunc').hover();
  const start = await scrollLeft(page);
  await page.mouse.wheel(600, 0);
  await expect.poll(async () => (await scrollLeft(page)) - start).toBeGreaterThan(400);
  await page.mouse.wheel(-1600, 0);
  await expect.poll(async () => start - (await scrollLeft(page))).toBeGreaterThan(400);
});

test('a feature photo zooms in as it reaches the middle and its neighbours move aside', async ({ page }) => {
  await page.goto('/gallery');
  await ready(page);
  await page.mouse.move(5, 5);
  const tedx = page.locator('#tedxunc');
  // Bring TEDx to the middle of the screen.
  await scroller(page).evaluate((el, id) => {
    const li = document.getElementById(id)!.parentElement!;
    el.scrollLeft = li.offsetLeft + li.offsetWidth / 2 - el.clientWidth / 2;
  }, 'tedxunc');
  await expect.poll(() => tedx.locator('figure').evaluate((el) => Number(getComputedStyle(el).scale))).toBeGreaterThan(1.1);
  const neighbour = await page.locator('.gallery__track:not(.gallery__track--copy) .gallery__tile').nth(2).evaluate((el) => parseFloat(getComputedStyle(el).translate));
  expect(neighbour).toBeGreaterThan(10);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the wall stays still, nothing zooms and the loop copies are not shown', async ({ page }) => {
    await page.goto('/gallery');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1500);
    expect(await scrollLeft(page)).toBe(0);
    await expect(page.locator('.gallery__track--copy').first()).toBeHidden();
    await expect(page.locator('#aws-quick-sprint figure')).toHaveCSS('scale', 'none');
  });
});

test('achievement rows with a photo link to it in the gallery', async ({ page }) => {
  await page.goto('/achievements');
  const thumbs = page.locator('.ach__thumb');
  await expect(thumbs).toHaveCount(6);
  await expect(page.locator('.ach__featured .ach__thumb').first()).toHaveAttribute('href', '/gallery#duke-hackathon');
  await thumbs.first().click();
  await expect(page).toHaveURL(/\/gallery#duke-hackathon$/);
  await expect(page.locator('.gallery__box')).toBeVisible();
});
