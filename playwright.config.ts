import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    // Astro 7 daemonizes `astro preview` when it detects an AI agent; --ignore-lock keeps it in the foreground so Playwright can manage it.
    command: 'npm run preview -- --ignore-lock',
    url: 'http://localhost:4321/',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
