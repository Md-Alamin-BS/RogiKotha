import { defineConfig, devices } from '@playwright/test';

// A port the demo (3000) and the tests' other tools do not use; the specs read it back from
// `baseURL`, so nothing else hard-codes it.
const PORT = 3107;
const ORIGIN = `http://127.0.0.1:${PORT}`;

// T-011 (BR9.4): browser smoke checks against the built app, Chromium only. Run `pnpm build`
// first and `npx playwright install chromium` once; CI does not run this until T-503.
export default defineConfig({
  testDir: 'e2e',
  // Inside node_modules so the results are never committed.
  outputDir: 'node_modules/.playwright-results',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: ORIGIN,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${PORT}`,
    url: `${ORIGIN}/en`,
    // Never adopt a server someone left running: it may not be this build.
    reuseExistingServer: false,
    // The app accepts only APP_URL's origin by default; this test origin must be allowed too (U41 R5).
    env: { APP_ALLOWED_ORIGINS: ORIGIN },
    timeout: 120_000,
  },
});
