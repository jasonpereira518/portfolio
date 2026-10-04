import { expect, test } from '@playwright/test';

const flagship = [
  { slug: 'case-closed', title: 'Case Closed', next: 'orbit' },
  { slug: 'orbit', title: 'Orbit', next: 'streetlab' },
  { slug: 'streetlab', title: 'StreetLab', next: 'gpu-portfolio-engine' },
  { slug: 'gpu-portfolio-engine', title: 'GPU Portfolio & Risk Decision Engine', next: 'case-closed' },
];

test('the work index lists all 17 projects in their groups', async ({ page }) => {
  await page.goto('/work');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Everything I've built.");
  await expect(page.locator('.feature')).toHaveCount(4);
  await expect(page.locator('.card')).toHaveCount(13);
  for (const group of ['Quant and fintech', 'Full-stack and client work', 'Mobile', 'Hackathons', 'Hardware']) {
    await expect(page.getByRole('heading', { name: group, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'CAT-45' })).toBeVisible();
});

test('on the work index the benchmark chart is shown whole, not cropped', async ({ page }) => {
  await page.goto('/work');
  const fit = (name: string) =>
    page
      .locator('.feature', { hasText: name })
      .locator('img')
      .evaluate((image) => getComputedStyle(image).objectFit);
  expect(await fit('GPU Portfolio')).toBe('contain');
  expect(await fit('StreetLab')).toBe('cover');
});

test('a case study cover carries alt text that describes the image', async ({ page }) => {
  await page.goto('/work/gpu-portfolio-engine');
  await expect(page.locator('.case__cover img')).toHaveAttribute('alt', /^Bar chart of QP solve time/);
});

test('a flagship card on the index opens its case study', async ({ page }) => {
  await page.goto('/work');
  await page.locator('.feature', { hasText: 'Orbit' }).click();
  await expect(page).toHaveURL(/\/work\/orbit\/?$/);
});

test('with reduced motion, hovering a flagship card does not zoom its image', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/work');
  const feature = page.locator('.feature').first();
  await feature.hover();
  // Wait out the 0.6s zoom transition, so a zoom that is merely delayed cannot pass as "none".
  await page.waitForTimeout(800);
  await expect(feature.locator('img')).toHaveCSS('transform', 'none');
});

for (const project of flagship) {
  test(`case study: ${project.title}`, async ({ page }) => {
    await page.goto(`/work/${project.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.title);
    for (const term of ['Role', 'Year', 'Status', 'Stack', 'Links']) {
      await expect(page.locator('.case__credits dt', { hasText: term })).toHaveCount(1);
    }
    for (const block of ['Problem', 'What I built', 'Result']) {
      await expect(page.locator('.case__blocks').getByRole('heading', { name: block, exact: true })).toBeVisible();
    }
    await expect(page.locator('.case__next')).toHaveAttribute('href', `/work/${project.next}`);
  });
}
