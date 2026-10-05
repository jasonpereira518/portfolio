import { expect, test } from './fixtures';

test('the achievements page has awards, certifications, and publications and talks', async ({ page }) => {
  await page.goto('/achievements');
  const article = page.locator('.ach');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Achievements');
  for (const heading of ['Awards and recognition', 'Certifications', 'Publications and talks']) {
    await expect(article.getByRole('heading', { level: 2, name: heading, exact: true })).toBeVisible();
  }
  await expect(article.locator('.ach__featured > li')).toHaveCount(6);
  await expect(article.getByRole('link', { name: /Case Closed/ }).first()).toHaveAttribute('href', '/work/case-closed');
  // A bare # in YAML starts a comment; this detail must keep its number.
  await expect(article.getByText('Marine Corps League Detachment #750')).toBeVisible();
  await expect(article.locator('.ach__authors')).toHaveText('Adala, V., Jun, T., Pereira, J., Sandwar, V., & Fernandes, A.');
});

test('every certification shows its credential ID', async ({ page }) => {
  await page.goto('/achievements');
  const certs = page.locator('#certifications .ach__cert');
  await expect(certs).toHaveCount(10);
  for (const cert of await certs.all()) await expect(cert.locator('.ach__id')).toHaveText(/^Credential ID \S+$/);
  await expect(page.getByText('Credential ID 3e4dcf30-deae-4ca1-aa70-1bca45640904')).toBeVisible();
});

test('the paper links to its journal page', async ({ page }) => {
  await page.goto('/achievements');
  await expect(page.locator('#publications').getByRole('link', { name: /Read the paper/ })).toHaveAttribute(
    'href',
    'https://journals.charlotte.edu/teem/article/view/2265',
  );
});

test('links to a project card land on that card', async ({ page }) => {
  await page.goto('/achievements');
  const hrefs = await page.locator('.ach a[href^="/work#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    await page.goto(href!);
    await expect(page.locator(`#${href!.split('#')[1]}.card`)).toHaveCount(1);
  }
});

test('the resume page is gone', async ({ page }) => {
  const response = await page.goto('/resume');
  expect(response?.status()).toBe(404);
});

test('unknown addresses get the 404 page with a way home', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('404');
  await expect(page.locator('main').getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/');
});

test('the 404 paint wash is exactly two shapes', async ({ page }) => {
  await page.goto('/404');
  await expect(page.locator('.lost__wash span')).toHaveCount(2);
});

test('the 404 paint wash uses the orange for paper, #F0440F', async ({ page }) => {
  await page.goto('/404');
  for (const shape of await page.locator('.lost__wash span').all()) {
    await expect(shape).toHaveCSS('background-color', 'rgb(240, 68, 15)');
  }
});

for (const width of [375, 1024, 1440]) {
  test(`the 404 page does not scroll sideways at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/404');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}
