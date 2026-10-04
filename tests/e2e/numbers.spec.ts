import { expect, test } from './fixtures';

test('each numeral counts up to its final text and has a caption', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('.numbers');
  for (const numeral of ['220+', '60+', '9M+', '1,100+', '4']) {
    const el = section.locator(`[data-count="${numeral}"]`);
    await el.scrollIntoViewIfNeeded();
    await expect(el).toHaveAttribute('data-counted', 'true'); // the count-up ran to the end
    await expect(el).toHaveText(numeral);
  }
  await expect(section.getByText('Solutions Architects interviewed at AWS before building')).toBeVisible();
  await expect(section.locator('.numbers__item')).toHaveCount(5);
});

test('the first numeral has no rule of its own, so it does not double the rule under the section head', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('.numbers__item');
  await expect(items.first()).toHaveCSS('border-top-width', '0px');
  await expect(items.nth(1)).toHaveCSS('border-top-width', '1px');
});
