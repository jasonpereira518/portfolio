import { expect, test } from './fixtures';

test('the statement reads as one sentence with its accent words emphasised', async ({ page }) => {
  await page.goto('/');
  const text = page.locator('.statement__text');
  await expect(text).toContainText(
    'I build AI systems that ship, grounded in the people who use them, measured before they’re claimed, and backed by a business case I write myself.',
  );
  await expect(text.locator('em')).toHaveText(['ship', 'people', 'measured', 'business', 'case']);
});

test('the marquee line is read once by screen readers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.statement .sr-only')).toHaveText('Velocity is a vector');
  await expect(page.locator('.marquee')).toHaveAttribute('aria-hidden', 'true');
});
