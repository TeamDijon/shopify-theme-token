import { defineConfig, devices } from '@playwright/test';

// E2E assertion layer for the validation--* pages (see .context/docs/validation.md).
//
// Precondition: the Shopify dev server must already be running locally
// (`npm run dev`, default http://127.0.0.1:9292) against the seeded store.
// This config intentionally declares NO `webServer` — it attaches to the
// dev server you run; it never spawns its own. If the server is down, tests
// fail fast with a connection error rather than booting a stray process.
//
// Two viewport projects straddle the theme's desktop breakpoint
// (`@media (width >= 48rem)` = 768px) so breakpoint-sensitive assertions
// (responsive top-margins, container queries) run in the right viewport.
export default defineConfig({
  testDir: '.tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:9292',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
});
