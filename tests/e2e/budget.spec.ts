import { gzipSync } from 'node:zlib';
import { expect, test } from './fixtures';

const KB = 1024;

test('the home page first load stays within the budget', async ({ page }) => {
  const sizes = { js: 0, total: 0, video: 0 };
  const pending: Promise<void>[] = [];

  page.on('response', (response) => {
    pending.push(
      (async () => {
        if (!response.ok()) return;
        let body: Buffer;
        try {
          body = await response.body();
        } catch {
          return; // redirects and aborted requests have no body, so they add no bytes
        }
        // The hero footage is fetched by script after load, and only when motion is allowed: it has its own budget.
        if (new URL(response.url()).pathname === '/hero/stage.mp4') {
          sizes.video += body.length;
          return;
        }
        const type = response.headers()['content-type'] ?? '';
        // The preview server does not compress; production does. Count text as it would be sent.
        const bytes = /javascript|css|html|svg|json/.test(type) ? gzipSync(body).length : body.length;
        sizes.total += bytes;
        if (type.includes('javascript')) sizes.js += bytes;
      })(),
    );
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await Promise.all(pending);

  const report = `JavaScript ${Math.round(sizes.js / KB)} KB, total ${Math.round(sizes.total / KB)} KB, video ${Math.round(sizes.video / KB)} KB`;
  expect(sizes.js, report).toBeLessThanOrEqual(50 * KB);
  expect(sizes.total, report).toBeLessThanOrEqual(600 * KB);
  expect(sizes.video, report).toBeLessThanOrEqual(3584 * KB);
});
