import { expect, test } from '@playwright/test';

test('the footer shows the email as a mail link, the profile buttons and the copyright', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer#contact');
  await expect(footer.getByRole('link', { name: 'jasonpereira518@gmail.com' })).toHaveAttribute(
    'href',
    'mailto:jasonpereira518@gmail.com',
  );
  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://linkedin.com/in/jasonpereira518',
  );
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/jasonpereira518',
  );
  await expect(footer.getByRole('link', { name: 'Google Scholar' })).toHaveAttribute('href', /scholar\.google\.com/);
  await expect(footer.getByText(/^© \d{4} Jason Pereira$/)).toBeVisible();
});

test('the email line is fitted to the width of the panel', async ({ page }) => {
  await page.goto('/');
  const email = page.locator('.footer__email');
  await expect(email).toHaveAttribute('style', /--fit:\s*[\d.]+/);
  const ratio = await email.evaluate((el) => {
    const inner = el.firstElementChild;
    return inner ? inner.getBoundingClientRect().width / el.clientWidth : 0;
  });
  expect(ratio).toBeGreaterThan(0.98);
  expect(ratio).toBeLessThan(1.01);
});
