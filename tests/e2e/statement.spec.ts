import { expect, test } from '@playwright/test';

test('the statement reads as one sentence with its accent words emphasised', async ({ page }) => {
  await page.goto('/');
  const text = page.locator('.statement__text');
  await expect(text).toContainText(
    'I build AI systems that ship. I start with the people who will use them, measure before I claim, and make the business case myself.',
  );
  await expect(text.locator('em')).toHaveText(['ship', 'people', 'measure', 'business', 'case']);
});

test('the marquee line is read once by screen readers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.statement .sr-only')).toHaveText('Direction before speed');
  await expect(page.locator('.marquee')).toHaveAttribute('aria-hidden', 'true');
});
