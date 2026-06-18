import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,         // 60s per test — production can be slow
  expect: { timeout: 15_000 },
  fullyParallel: false,    // run serially: dealer creates cert first, admin acts on it
  retries: 0,
  workers: 1,

  use: {
    baseURL:    process.env.BASE_URL ?? 'https://mvautoassist.in',
    headless:   true,
    screenshot: 'on',                      // always capture
    video:      'retain-on-failure',
    trace:      'retain-on-failure',
    viewport:   { width: 1400, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['list'],
    ['html', { outputFolder: 'qa-report', open: 'never' }],
  ],

  outputDir: 'qa-test-results',
});
