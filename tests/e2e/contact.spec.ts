import { expect, test } from './fixtures';

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

test('each profile button fills with its brand colour on hover', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // no colour transition to wait out
  await page.goto('/');
  const footer = page.locator('footer#contact');
  for (const [name, colour] of [
    ['LinkedIn', 'rgb(10, 102, 194)'], // #0A66C2
    ['GitHub', 'rgb(110, 84, 148)'], // #6E5494
    ['Google Scholar', 'rgb(66, 133, 244)'], // #4285F4
  ]) {
    const button = footer.getByRole('link', { name });
    await button.hover();
    await expect(button, name).toHaveCSS('background-color', colour);
    await expect(button, name).toHaveCSS('color', 'rgb(255, 255, 255)');
  }
});

test('the footer links end with Gallery, at the bottom right', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('footer#contact nav[aria-label="Footer"] a');
  await expect(links.last()).toHaveText('Gallery');
  await expect(links.last()).toHaveAttribute('href', '/gallery');
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
