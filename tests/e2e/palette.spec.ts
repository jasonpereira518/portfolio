import { expect, test, type Page } from './fixtures';

const palette = (page: Page) => page.locator('#palette');

async function openPalette(page: Page) {
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(palette(page)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
}

test('⌘K lists every command, and Escape closes the palette', async ({ page }) => {
  await openPalette(page);
  // 17 projects, 5 pages, 4 links.
  await expect(palette(page).getByRole('option')).toHaveCount(26);
  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();
});

test('pressing ⌘K again closes it', async ({ page }) => {
  await openPalette(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(palette(page)).toBeHidden();
});

test('a flagship project opens its case-study page', async ({ page }) => {
  await openPalette(page);
  await page.keyboard.type('case closed');
  await expect(palette(page).getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\/case-closed$/);
});

test('a card project jumps to its anchor on the work page', async ({ page }) => {
  await openPalette(page);
  await page.keyboard.type('limit order book');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work#limit-order-book$/);
});

test('arrow keys move the highlight, and Enter runs the highlighted command', async ({ page }) => {
  await openPalette(page);
  // "pages" is a group name, so it narrows the list to the page commands: Home, then Work.
  await page.keyboard.type('pages');
  await page.keyboard.press('ArrowDown');
  const second = palette(page).getByRole('option').nth(1);
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-activedescendant', (await second.getAttribute('id')) ?? '');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work$/);
});

test('"achiev" opens the achievements page', async ({ page }) => {
  await openPalette(page);
  await page.keyboard.type('achiev');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/achievements$/);
});

test('copy email puts the address on the clipboard and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openPalette(page);
  await page.keyboard.type('copy email');
  await page.keyboard.press('Enter');
  await expect(palette(page).getByRole('status')).toHaveText('Email copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('jasonpereira518@gmail.com');
  await expect(palette(page)).toBeHidden();
});

for (const [query, href] of [
  ['linkedin', 'https://linkedin.com/in/jasonpereira518'],
  ['github', 'https://github.com/jasonpereira518'],
]) {
  test(`${query} opens the profile in a new tab`, async ({ page, context }) => {
    // The outside site is stubbed, so the test only checks where the tab was sent.
    await context.route(/^https:\/\/(linkedin|github)\.com\//, (route) => route.fulfill({ contentType: 'text/html', body: 'stub' }));
    await openPalette(page);
    await page.keyboard.type(query);
    const opened = context.waitForEvent('page');
    await page.keyboard.press('Enter');
    await (await opened).waitForURL(href);
  });
}

test('the closed palette is not in the page, so the skip link stays the first Tab stop', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});
