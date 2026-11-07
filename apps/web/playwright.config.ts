import { defineConfig, devices } from '@playwright/test';

import { E2E_HOST, E2E_ORIGIN, E2E_PORT, e2eEnvironment, workerCount } from './e2e/helpers/env';

// U50 release-1 suite (BR1.1, BR1.2, BR1.6): Chromium only, three journey projects plus the
// log-scan and nfr13 support projects. The config test (src/e2e-config.test.ts) pins all of it.

const PHONE = { width: 360, height: 800 } as const;
const DESKTOP = { width: 1280, height: 800 } as const;

export default defineConfig({
  testDir: 'e2e',
  // Never a Vitest `*.test.ts` file (BR1.1).
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results/artifacts',
  fullyParallel: true,
  forbidOnly: true,
  workers: workerCount(),
  retries: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
  globalSetup: './e2e/helpers/global-setup.ts',
  globalTeardown: './e2e/helpers/global-teardown.ts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: E2E_ORIGIN,
    // The locale comes from the URL, never from the project.
    timezoneId: 'Asia/Dhaka',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-360',
      testMatch: [
        'journeys/**/*.spec.ts',
        'a11y/keyboard.spec.ts',
        'a11y/live-region.spec.ts',
        'a11y/motion-switch.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        viewport: PHONE,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        colorScheme: 'light',
      },
    },
    {
      name: 'chromium-desktop',
      testMatch: [
        'journeys/**/*.spec.ts',
        'a11y/**/*.spec.ts',
        'smoke/**/*.spec.ts',
        'security/security.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP, colorScheme: 'light' },
    },
    {
      // Part 1, the P3.11 composer and the motion switch only (review 01 R-13); the dark theme
      // is covered here once.
      name: 'chromium-reduced-motion',
      testMatch: [
        'journeys/reading.spec.ts',
        'journeys/writing.spec.ts',
        'a11y/motion-switch.spec.ts',
      ],
      grep: [/P1\./, /P3\.11 /, /A11Y motion/],
      use: {
        ...devices['Desktop Chrome'],
        viewport: PHONE,
        isMobile: true,
        reducedMotion: 'reduce',
        colorScheme: 'dark',
      },
    },
    {
      // After every journey, so the scan sees every line the run wrote.
      name: 'log-scan',
      testMatch: ['security/health.spec.ts', 'security/log-scan.spec.ts'],
      dependencies: ['chromium-360', 'chromium-desktop', 'chromium-reduced-motion'],
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP },
    },
    {
      // Only through `pnpm e2e:perf`.
      name: 'nfr13',
      testMatch: ['perf/**/*.spec.ts'],
      // BR5.5: a failing median is never retried by the suite.
      retries: 0,
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP },
    },
  ],
  webServer: {
    // ASSUMPTION(U50): readiness is the port, not `/en`: Playwright starts the web server before
    // the global setup creates and seeds the database, so a first-ever run would get a 500 (ISS-752).
    command: `node e2e/helpers/web-server.mjs ${E2E_HOST} ${E2E_PORT}`,
    port: E2E_PORT,
    // Never adopt a server someone left running: it may not be this build.
    reuseExistingServer: false,
    timeout: 120_000,
    env: e2eEnvironment(),
  },
});
