// Every test starts as a returning visitor, so the first-visit intro does not cover the page.
// intro.spec.ts turns it back on with `test.use({ skipIntro: false })`.
import { test as base } from '@playwright/test';

export * from '@playwright/test';

export const test = base.extend<{ skipIntro: boolean }>({
  skipIntro: [true, { option: true }],
  page: async ({ page, skipIntro }, use) => {
    if (skipIntro) {
      await page.addInitScript(() => {
        try {
          sessionStorage.setItem('jp-intro-seen', '1');
        } catch {
          // Storage is blocked, so the intro plays; nothing else to do.
        }
      });
    }
    await use(page);
  },
});
