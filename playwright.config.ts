import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// Where Playwright's own browser download is blocked, set this to "msedge" or
// "chrome" to use the copy already installed on the machine.
const channel = process.env.E2E_BROWSER_CHANNEL;
const browser = channel ? { channel } : {};

// The tests run against a production build with the demo data loaded, because
// that is what a visitor gets. Run `pnpm build` first; the server is started
// here (or reused, if one is already listening).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Sign-in and saving go to a remote database, and from some regions each call
  // takes several seconds. The defaults (30 s per test, 5 s per check) are too
  // tight there, and too many parallel sign-ins only make it slower.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browser } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], ...browser },
      testMatch: /public-pages\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm start -p ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
