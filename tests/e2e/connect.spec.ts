import { expect, test } from './fixtures';

test('/connect opens on the contact card, with every link', async ({ page }) => {
  await page.goto('/connect');
  const card = page.getByRole('dialog', { name: 'Jason Pereira' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: 'jasonpereira518@gmail.com' })).toHaveAttribute(
    'href',
    'mailto:jasonpereira518@gmail.com',
  );
  for (const [name, href] of [
    ['Email', 'mailto:jasonpereira518@gmail.com'],
    ['LinkedIn', 'https://linkedin.com/in/jasonpereira518'],
    ['GitHub', 'https://github.com/jasonpereira518'],
    ['Google Scholar', /scholar\.google\.com/],
    ['Resume', '/resume'],
    ['Achievements', '/achievements'],
  ] as const) {
    await expect(card.getByRole('link', { name, exact: true }), name).toHaveAttribute('href', href);
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

for (const [how, close] of [
  ['Esc', (page) => page.keyboard.press('Escape')],
  ['the close button', (page) => page.getByRole('button', { name: 'Close' }).click()],
  ['View portfolio', (page) => page.getByRole('button', { name: 'View portfolio' }).click()],
  ['a click outside', (page) => page.mouse.click(5, 5)],
] as const satisfies [string, (page: import('@playwright/test').Page) => Promise<void>][]) {
  test(`${how} closes the card onto the homepage`, async ({ page }) => {
    await page.goto('/connect');
    const card = page.locator('#connect');
    await expect(card).toBeVisible();
    await close(page);
    await expect(card).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('main#main')).toBeVisible();
  });
}

test.describe('first visit', () => {
  test.use({ skipIntro: false });

  test('/connect skips the intro', async ({ page }) => {
    await page.goto('/connect');
    await expect(page.locator('html')).not.toHaveClass(/has-intro/);
    await expect(page.locator('#connect')).toBeVisible();
  });
});

test('the homepage has no card', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#connect')).toHaveCount(0);
});
