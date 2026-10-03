import { expect, test } from '@playwright/test';

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
