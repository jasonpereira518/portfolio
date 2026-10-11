import { expect, test } from './fixtures';

const flagship = [
  { slug: 'case-closed', title: 'Case Closed', next: 'orbit' },
  { slug: 'orbit', title: 'Orbit', next: 'streetlab' },
  { slug: 'streetlab', title: 'StreetLab', next: 'gpu-portfolio-engine' },
  { slug: 'gpu-portfolio-engine', title: 'GPU Portfolio & Risk Decision Engine', next: 'case-closed' },
];

test('the projects index lists all 18 projects in their groups', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Everything I've built.");
  await expect(page.locator('.feature')).toHaveCount(4);
  await expect(page.locator('.card')).toHaveCount(14);
  for (const group of ['Quant and fintech', 'AI and machine learning', 'Full-stack and client work', 'Mobile', 'Hackathons', 'Hardware']) {
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
  await expect
    .poll(async () => {
      const [phoneFirst, phoneSecond] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
      return phoneSecond.y > phoneFirst.y + phoneFirst.height / 2;
    })
    .toBe(true);
});

test('on the projects index the benchmark chart is shown whole, not cropped', async ({ page }) => {
  await page.goto('/projects');
  const fit = (name: string) =>
    page
      .locator('.feature', { hasText: name })
      .locator('img')
      .first()
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

// The same hover preview as jasonpereira.live: it opens when you hover anywhere on a card, follows the cursor, takes the
// picture's shape within 360 x 300, tilts away from the cursor and names the project.
test('hovering a card opens a preview that follows the cursor, takes the picture shape and names the project', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  const card = page.locator('#ethics-bowl-academy');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const x = box.x + 40; // over the card's text, not its picture
  const y = box.y + 40;
  await page.mouse.move(x, y);
  const preview = page.locator('#project-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);
  await expect(preview.locator('.project-hover-preview__title')).toHaveText('Ethics Bowl Academy');
  await expect(card).toHaveClass(/is-preview-active/);
  await expect.poll(async () => (await preview.boundingBox())!.width).toBeLessThanOrEqual(361);

  // To the right of the cursor, tilted away from it, and it follows.
  await expect(preview).toHaveClass(/is-right-side/);
  const first = (await preview.boundingBox())!;
  expect(first.x).toBeGreaterThan(x);
  await page.mouse.move(x + 60, y + 30);
  await expect.poll(async () => (await preview.boundingBox())!.x).toBeGreaterThan(first.x + 40);

  await page.mouse.move(2, 2);
  await expect(preview).not.toHaveClass(/is-visible/);
  await expect(card).not.toHaveClass(/is-preview-active/);
});

test('the preview flips to the left of the cursor near the right edge', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  const card = page.locator('#carolina-corner');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const x = box.x + box.width - 20;
  await page.mouse.move(x, box.y + 30);
  const preview = page.locator('#project-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);
  await expect(preview).toHaveClass(/is-left-side/);
  expect((await preview.boundingBox())!.x + (await preview.boundingBox())!.width).toBeLessThanOrEqual(x);
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

test('hovering GPU Portfolio Engine fades its architecture diagram in over the benchmark chart', async ({ page }) => {
  await page.goto('/projects');
  const feature = page.locator('.feature', { hasText: 'GPU Portfolio' });
  const alt = feature.locator('.feature__alt');
  await feature.scrollIntoViewIfNeeded();
  await expect(alt).toHaveCSS('opacity', '0');
  await feature.hover();
  await expect(alt).toHaveCSS('opacity', '1');
  await page.mouse.move(2, 2);
  await expect(alt).toHaveCSS('opacity', '0');
});

test('each main project with a clip lists it, and the clips are light enough to load on hover', async ({ page, request }) => {
  await page.goto('/projects');
  const sources = await page.locator('.feature__video source').evaluateAll((els) => els.map((el) => (el as HTMLSourceElement).getAttribute('src')));
  expect(sources.sort()).toEqual(['/projects/case-closed.mp4', '/projects/orbit.mp4', '/projects/streetlab.mp4']);
  for (const src of sources) {
    const response = await request.get(src!);
    expect(response.ok(), src!).toBe(true);
    expect((await response.body()).length, src!).toBeLessThan(2 * 1024 * 1024);
  }
});

test('a card shows its links as pill buttons named GitHub, Live site, Dev post or Video', async ({ page }) => {
  await page.goto('/projects');
  const pillNames = async (id: string) => page.locator(`#${id} .pill`).evaluateAll((els) => els.map((el) => el.textContent!.trim()));
  expect(await pillNames('deltahedge')).toEqual(['Dev post', 'GitHub']);
  expect(await pillNames('p2p-live')).toEqual(['Live site', 'GitHub']);
  expect(await pillNames('ethics-bowl-academy')).toEqual(['Live site', 'GitHub']);
  const pill = page.locator('#deltahedge .pill').first();
  await expect(pill).toHaveCSS('border-radius', '999px');
  await expect(pill).toHaveAttribute('target', '_blank');
  await expect(page.locator('#deltahedge .card__links a:not(.pill)')).toHaveCount(0);
});

test('eleven of the smaller projects have a thumbnail, and each loads', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  const thumbs = page.locator('.card__thumb img');
  await expect(thumbs).toHaveCount(11);
  for (let index = 0; index < 11; index++) {
    const image = thumbs.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: `thumbnail ${index}` }).toBe(true);
    await expect(image).not.toHaveAttribute('alt', '');
  }
  // The popups name a different picture for the projects that have two.
  const peeks = await page.locator('#deltahedge .card__thumb, #p2p-live .card__thumb').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.peek));
  const covers = await page.locator('#deltahedge .card__thumb img, #p2p-live .card__thumb img').evaluateAll((els) => els.map((el) => (el as HTMLImageElement).currentSrc));
  expect(peeks.every((peek, index) => peek && peek !== covers[index])).toBe(true);
  // A medal now sits on DeltaHedge's thumbnail.
  await expect(page.locator('#deltahedge .medal')).toHaveAttribute('aria-label', /NexHacks/);
});

test('projects with a square picture show it as a 1:1 widget, and the two with a second image preview that on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  for (const id of ['carolina-corner', 'leet-streak', 'p2p-live', 'cat-45', 'project-goldilocks']) {
    const thumb = page.locator(`#${id} .card__thumb`);
    await thumb.scrollIntoViewIfNeeded();
    const box = (await thumb.boundingBox())!;
    expect(Math.abs(box.width - box.height), id).toBeLessThan(2);
  }
  // A wide screenshot keeps its wide frame.
  const wide = (await page.locator('#ethics-bowl-academy .card__thumb').boundingBox())!;
  expect(wide.width).toBeGreaterThan(wide.height * 1.4);
  // Carolina Corner and P2P Live preview a different picture from the widget.
  for (const id of ['carolina-corner', 'p2p-live']) {
    const [peek, cover] = await page.locator(`#${id} .card__thumb`).evaluate((el) => [(el as HTMLElement).dataset.peek, (el.querySelector('img') as HTMLImageElement).currentSrc]);
    expect(peek, id).toBeTruthy();
    expect(peek, id).not.toBe(cover);
  }
});

test('Brain Bubble Pop carries a 1st place medal for the Anthropic Claude AI Hackathon', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  const medal = page.locator('#brain-bubble-pop .medal');
  await expect(medal).toHaveAttribute('aria-label', /1st Place.*Anthropic Claude AI Hackathon/);
  await medal.scrollIntoViewIfNeeded();
  await medal.hover();
  await expect(medal.locator('.medal__tip')).toBeVisible();
  await expect(medal.locator('.medal__tip')).toContainText('team of two');
});

test.describe('on a 2x screen', () => {
  test.use({ deviceScaleFactor: 2 });

  test('card thumbnails are delivered at twice the size they are shown', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects');
    for (const id of ['ethics-bowl-academy', 'deltahedge', 'carolina-corner']) {
      const thumb = page.locator(`#${id} .card__thumb img`);
      await thumb.scrollIntoViewIfNeeded();
      await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: id }).toBe(true);
      // The file the browser chose, in real pixels (naturalWidth reports the shown size, so read the srcset instead).
      const [shown, fileWidth] = await thumb.evaluate((img: HTMLImageElement) => {
        const chosen = img.srcset.split(',').map((entry) => entry.trim().split(' ')).find(([url]) => img.currentSrc.endsWith(url.split('/').pop()!));
        return [img.getBoundingClientRect().width, Number(chosen?.[1]?.replace('w', ''))];
      });
      expect(fileWidth, id).toBeGreaterThanOrEqual(shown * 2 - 1);
    }
  });
});

test('Road Object Detection is listed under AI and machine learning, with a video pill and its demo clip in the preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  const group = page.locator('section[aria-labelledby="group-ml"]');
  await expect(group.getByRole('heading', { name: 'AI and machine learning' })).toBeVisible();
  const card = group.locator('#object-detection');
  await expect(card.getByRole('heading', { name: 'Road Object Detection' })).toBeVisible();
  await expect(card).toContainText('YOLOv3');
  await expect(card).not.toContainText('YOLOv5');
  const pill = card.locator('.pill');
  await expect(pill).toHaveText('Video');
  await expect(pill).toHaveAttribute('href', 'https://www.youtube.com/watch?v=GjQ7Zq4I4bM');
  await expect(card.locator('.card__thumb')).toHaveAttribute('data-peek-video', '/projects/object-detection.mp4');
});
