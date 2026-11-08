// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { PlaywrightTestConfig } from '@playwright/test';
import { describe, expect, it } from 'vitest';

// BR1.9: the browser suite's own configuration (BR1.1), locale parity (BR1.4), the ban on fixed
// sleeps (BR1.7), the ban on test-support imports (BR7.4) and on a CI workflow (FD-102, BR15.2).

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Loaded by path: the config sits outside `src`, so no import boundary covers it.
const { default: config } = (await import(
  pathToFileURL(path.join(webDir, 'playwright.config.ts')).href
)) as { default: PlaywrightTestConfig };
const e2eDir = path.join(webDir, 'e2e');
const repoRoot = path.resolve(webDir, '..', '..');

type Project = NonNullable<PlaywrightTestConfig['projects']>[number];

interface ExpectedProject {
  testMatch: string[];
  viewport?: { width: number; height: number };
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
  colorScheme?: 'light' | 'dark';
  reducedMotion?: 'reduce';
  grep?: string[];
  dependencies?: string[];
}

const PHONE = { width: 360, height: 800 };
const DESKTOP = { width: 1280, height: 800 };
const JOURNEY_PROJECTS = ['chromium-360', 'chromium-desktop', 'chromium-reduced-motion'];

const EXPECTED: Record<string, ExpectedProject> = {
  'chromium-360': {
    testMatch: [
      'journeys/**/*.spec.ts',
      'a11y/keyboard.spec.ts',
      'a11y/live-region.spec.ts',
      'a11y/motion-switch.spec.ts',
    ],
    viewport: PHONE,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    colorScheme: 'light',
  },
  'chromium-desktop': {
    testMatch: [
      'journeys/**/*.spec.ts',
      'a11y/**/*.spec.ts',
      'smoke/**/*.spec.ts',
      'security/security.spec.ts',
    ],
    viewport: DESKTOP,
    isMobile: false,
    colorScheme: 'light',
  },
  'chromium-reduced-motion': {
    testMatch: [
      'journeys/reading.spec.ts',
      'journeys/writing.spec.ts',
      'a11y/motion-switch.spec.ts',
    ],
    viewport: PHONE,
    isMobile: true,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    grep: [/P1\./.source, /P3\.11 /.source, /A11Y motion/.source],
  },
  'log-scan': {
    testMatch: ['security/health.spec.ts', 'security/log-scan.spec.ts'],
    dependencies: JOURNEY_PROJECTS,
  },
  nfr13: { testMatch: ['perf/**/*.spec.ts'] },
};

const ALLOWED_VIEWPORTS = [PHONE, DESKTOP].map(({ width, height }) => `${width}x${height}`);

const asList = <T>(value: T | readonly T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? [...(value as readonly T[])] : [value as T];

/** Every way a config departs from BR1.1, BR1.2 and BR1.6. */
function configProblems(subject: PlaywrightTestConfig): string[] {
  const problems: string[] = [];
  if (subject.testDir !== 'e2e') problems.push(`testDir is ${String(subject.testDir)}`);
  if (subject.testMatch !== '**/*.spec.ts')
    problems.push('top-level testMatch is not **/*.spec.ts');
  if (subject.retries !== 1) problems.push(`retries is ${String(subject.retries)}`);
  if (typeof subject.workers !== 'number' || subject.workers > 4) problems.push('workers above 4');
  if (subject.use?.timezoneId !== 'Asia/Dhaka') problems.push('timezoneId is not Asia/Dhaka');
  if (subject.use?.locale !== undefined)
    problems.push('a locale is set; it must come from the URL');
  if (subject.use?.trace !== 'on-first-retry') problems.push('trace is not on-first-retry');
  if (subject.use?.video !== 'off') problems.push('video is not off');

  const server = asList(subject.webServer)[0];
  if (!server) problems.push('no webServer');
  else {
    if (server.port !== 3107 && !String(server.url ?? '').startsWith('http://127.0.0.1:3107')) {
      problems.push('webServer is not on 127.0.0.1:3107');
    }
    if (server.reuseExistingServer !== false) problems.push('webServer may reuse a server');
    if (!/next start|web-server\.mjs/.test(server.command))
      problems.push('webServer is not next start');
  }

  const projects = asList<Project>(subject.projects);
  const names = projects.map((project) => project.name ?? '');
  if (names.join(',') !== Object.keys(EXPECTED).join(',')) {
    problems.push(`projects are ${names.join(', ')}`);
  }
  for (const project of projects) {
    const name = project.name ?? '';
    const expected = EXPECTED[name];
    const use = project.use ?? {};
    const engine = use.browserName ?? use.defaultBrowserType;
    if (engine !== 'chromium') problems.push(`${name} runs on ${String(engine)}`);
    if (use.channel !== undefined) problems.push(`${name} uses channel ${use.channel}`);
    const viewport = use.viewport ? `${use.viewport.width}x${use.viewport.height}` : 'none';
    if (!ALLOWED_VIEWPORTS.includes(viewport)) problems.push(`${name} has viewport ${viewport}`);
    const patterns = asList(project.testMatch).map(String);
    for (const pattern of patterns) {
      if (!pattern.endsWith('.spec.ts')) problems.push(`${name} matches ${pattern}`);
    }
    if (!expected) continue;
    if (patterns.join('|') !== expected.testMatch.join('|')) {
      problems.push(`${name} testMatch is ${patterns.join(', ')}`);
    }
    for (const key of [
      'viewport',
      'isMobile',
      'hasTouch',
      'deviceScaleFactor',
      'colorScheme',
      'reducedMotion',
    ] as const) {
      if (
        expected[key] !== undefined &&
        JSON.stringify(use[key]) !== JSON.stringify(expected[key])
      ) {
        problems.push(`${name} ${key} is ${JSON.stringify(use[key])}`);
      }
    }
    const grep = asList(project.grep).map((pattern) => pattern.source);
    if (grep.join('|') !== (expected.grep ?? []).join('|')) {
      problems.push(`${name} grep is ${grep.join(', ')}`);
    }
    const dependencies = project.dependencies ?? [];
    if (dependencies.join('|') !== (expected.dependencies ?? []).join('|')) {
      problems.push(`${name} depends on ${dependencies.join(', ')}`);
    }
  }
  return problems;
}

interface SourceFile {
  /** Relative to `apps/web/e2e`, with forward slashes. */
  path: string;
  text: string;
}

function readTree(dir: string, base = dir): SourceFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): SourceFile[] => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return readTree(full, base);
    if (!/\.(ts|mts|mjs|js)$/.test(entry.name)) return [];
    return [
      {
        path: path.relative(base, full).split(path.sep).join('/'),
        text: readFileSync(full, 'utf8'),
      },
    ];
  });
}

const FIXED_SLEEP = [
  /\bwaitForTimeout\s*\(/,
  /setTimeout\(\s*(resolve|res|r|done)\s*,/,
  /from\s+['"](node:)?timers\/promises['"]/,
];
const FOCUSED_OR_SKIPPED = /\btest(\.describe)?\.(only|skip|fixme)\s*\(/;
const TEST_SUPPORT_IMPORT =
  /(from\s+['"][^'"]*test-support[^'"]*['"])|(import\s*\(\s*['"][^'"]*test-support)|(require\s*\(\s*['"][^'"]*test-support)/;

/** BR1.4, BR1.7, BR7.4 over the e2e sources. */
function sourceProblems(files: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  for (const file of files) {
    if (FIXED_SLEEP.some((pattern) => pattern.test(file.text))) {
      problems.push(`${file.path} has a fixed sleep`);
    }
    if (FOCUSED_OR_SKIPPED.test(file.text)) problems.push(`${file.path} focuses or skips a test`);
    if (TEST_SUPPORT_IMPORT.test(file.text)) problems.push(`${file.path} imports test-support`);
    const localized = /^(journeys|a11y)\/.+\.spec\.ts$/.test(file.path);
    if (localized) {
      if (!/\b(forEachLocale|describeEachLocale)\s*\(/.test(file.text)) {
        problems.push(`${file.path} does not declare its tests through forEachLocale`);
      }
      if (/for\s*\(\s*const\s+locale\s+of\b/.test(file.text) || /\[(bn|en)\]/.test(file.text)) {
        problems.push(`${file.path} spells a locale loop or title by hand`);
      }
    }
  }
  return problems;
}

describe('the browser suite configuration (BR1.1, BR1.9)', () => {
  it('has the five Chromium projects with their viewports, files and order', () => {
    expect(configProblems(config)).toEqual([]);
  });

  it('never loads a Vitest *.test.ts file', () => {
    const patterns = [
      String(config.testMatch),
      ...asList<Project>(config.projects).flatMap((project) =>
        asList(project.testMatch).map(String),
      ),
    ];
    expect(patterns.filter((pattern) => !pattern.endsWith('.spec.ts'))).toEqual([]);
  });

  it('runs nfr13 only on perf/**, security.spec only on the desktop, health and log-scan last', () => {
    const projects = asList<Project>(config.projects);
    const matching = (file: string) =>
      projects
        .filter((project) => asList(project.testMatch).map(String).includes(file))
        .map((project) => project.name);
    expect(matching('perf/**/*.spec.ts')).toEqual(['nfr13']);
    expect(matching('security/security.spec.ts')).toEqual(['chromium-desktop']);
    expect(matching('security/health.spec.ts')).toEqual(['log-scan']);
    expect(matching('security/log-scan.spec.ts')).toEqual(['log-scan']);
  });

  it('finds a planted config with another engine, viewport and file pattern', () => {
    const projects = asList<Project>(config.projects);
    const planted: PlaywrightTestConfig = {
      ...config,
      testMatch: '**/*.@(spec|test).ts',
      projects: [
        ...projects.slice(0, 1).map((project) => ({
          ...project,
          testMatch: ['journeys/**/*.test.ts'],
          use: { ...project.use, viewport: { width: 390, height: 844 } },
        })),
        ...projects.slice(1),
        { name: 'firefox', testMatch: 'journeys/**/*.spec.ts', use: { browserName: 'firefox' } },
      ],
    };
    const problems = configProblems(planted);
    expect(problems).toContain('top-level testMatch is not **/*.spec.ts');
    expect(problems).toContain('chromium-360 matches journeys/**/*.test.ts');
    expect(problems).toContain('chromium-360 has viewport 390x844');
    expect(problems).toContain('firefox runs on firefox');
  });
});

describe('the browser suite sources (BR1.4, BR1.7, BR7.4)', () => {
  const files = readTree(e2eDir);

  it('declare journeys through forEachLocale, never sleep, skip or import test-support', () => {
    expect(sourceProblems(files)).toEqual([]);
  });

  it('finds planted sleeps, skips, imports and a hand-written locale loop', () => {
    const planted: SourceFile[] = [
      {
        path: 'journeys/bad.spec.ts',
        text: "for (const locale of ['bn', 'en']) test('P1.1 [bn] x', f);",
      },
      { path: 'helpers/sleep.ts', text: 'await page.waitForTimeout(500);' },
      { path: 'helpers/nap.ts', text: 'await new Promise((resolve) => setTimeout(resolve, 200));' },
      { path: 'a11y/skip.spec.ts', text: "forEachLocale('A11Y x', '', f); test.skip('y', f);" },
      { path: 'fixtures/data.ts', text: "import { seed } from '@rogikotha/test-support';" },
    ];
    expect(sourceProblems(planted)).toEqual([
      'journeys/bad.spec.ts does not declare its tests through forEachLocale',
      'journeys/bad.spec.ts spells a locale loop or title by hand',
      'helpers/sleep.ts has a fixed sleep',
      'helpers/nap.ts has a fixed sleep',
      'a11y/skip.spec.ts focuses or skips a test',
      'fixtures/data.ts imports test-support',
    ]);
  });
});

describe('no CI workflow runs the browser suite (FD-102, BR15.2)', () => {
  it('has no e2e workflow file under .github/workflows', () => {
    const dir = path.join(repoRoot, '.github', 'workflows');
    const files = existsSync(dir) ? readdirSync(dir) : [];
    expect(files.filter((name) => /e2e/i.test(name))).toEqual([]);
  });
});
