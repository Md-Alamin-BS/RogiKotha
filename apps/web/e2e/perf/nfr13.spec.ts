import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { PROFILE_DOCTOR, R1_TITLE } from '../fixtures/seed-facts';
import { E2E_ORIGIN, resultsDir } from '../helpers/env';
import type { Locale } from '../helpers/locale';
import { openByName, openExperienceByTitle } from '../helpers/reading';
import {
  measureFlow,
  measureNavigation,
  median,
  MOBILE_THROTTLING,
  NoLcpError,
  type FlowRun,
  type PageKind,
} from './lighthouse-flow';

// BR5.1, BR5.4 to BR5.6: the NFR13 gate. Four pages, five Lighthouse flows each, the median
// against the thresholds, the LCP element never animated in. A failing median fails the test and
// nothing reruns it here (the project sets retries to 0); the rerun is manual (BR5.5):
// `pnpm e2e:perf --grep "<page>"` on an idle machine.

const RUNS = 5;
const THRESHOLDS = { lcpMs: 2_500, cls: 0.1, inpMs: 200 } as const;
/** AC2.3.6, AC12.3.5: the reference for the record-only pages. No gate. */
const REFERENCE_MS = 3_000;

// A flow is about a minute under throttling; five of them plus the animation probe per page.
const PAGE_TIMEOUT_MS = 600_000;

// One worker runs the whole file in order: parallel flows would load the machine and the figures.
test.describe.configure({ mode: 'serial' });

/** ISS-815: a run Lighthouse lost (no LCP) is redone at most this often per page, never counted. */
const MAX_NO_LCP_RETRIES = 2;

interface NoLcpRetry {
  run: number;
  reason: string;
  report: string;
}

async function withNoLcpRetries<T>(
  retries: NoLcpRetry[],
  run: number,
  measure: () => Promise<T>,
): Promise<T> {
  for (;;) {
    try {
      return await measure();
    } catch (error) {
      if (!(error instanceof NoLcpError) || retries.length >= MAX_NO_LCP_RETRIES) throw error;
      retries.push({ run, reason: error.reason, report: error.report });
      test.info().annotations.push({
        type: 'nfr13-no-lcp-retry',
        description: `run ${run + 1}: ${error.reason} (${error.report})`,
      });
    }
  }
}

let r1Id = '';
let doctorId = '';
let facilityId = '';

const lastSegment = (url: string): string => new URL(url).pathname.split('/').pop() ?? '';

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: E2E_ORIGIN, timezoneId: 'Asia/Dhaka' });
  const page = await context.newPage();
  try {
    // BR5.1: r1's public id comes from the URL after opening it by its seeded title.
    await openExperienceByTitle(page, 'en', R1_TITLE.en);
    r1Id = lastSegment(page.url());

    await page.goto('/bn/doctors');
    await openByName(page, 'doctor-link', PROFILE_DOCTOR.bn);
    await expect(page).toHaveURL(/\/bn\/doctors\/[^/?]+$/);
    doctorId = lastSegment(page.url());

    await page.goto('/bn/facilities');
    await page.getByTestId('facility-link').first().click();
    await expect(page).toHaveURL(/\/bn\/facilities\/[^/?]+$/);
    facilityId = lastSegment(page.url());
  } finally {
    await context.close();
  }
});

function writeRecord(name: string, record: unknown): void {
  const folder = path.join(resultsDir(), 'nfr13');
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`);
}

interface LcpProbe {
  selector: string;
  found: boolean;
  animations: number;
  revealAncestor: boolean;
  /** Opacity of the element times that of every ancestor, at the first frame it exists. */
  opacity: number;
}

/**
 * BR5.4: loads the page in Playwright and reads, at the first frame where the LCP element
 * exists, whether it (or anything inside) animates, whether it sits under `[data-reveal]`, and
 * its effective opacity.
 */
async function probeLcpElement(page: Page, url: string, selector: string): Promise<LcpProbe> {
  await page.addInitScript((target: string) => {
    const holder = window as unknown as { __lcpProbe?: unknown };
    const look = (): void => {
      const element = (() => {
        try {
          return document.querySelector(target);
        } catch {
          return null;
        }
      })();
      if (!element) {
        requestAnimationFrame(look);
        return;
      }
      let opacity = 1;
      for (let node: Element | null = element; node; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      holder.__lcpProbe = {
        selector: target,
        found: true,
        animations: element.getAnimations({ subtree: true }).length,
        revealAncestor: element.closest('[data-reveal]') !== null,
        opacity,
      };
    };
    requestAnimationFrame(look);
  }, selector);
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __lcpProbe?: unknown }).__lcpProbe);
  return page.evaluate(() => (window as unknown as { __lcpProbe: LcpProbe }).__lcpProbe);
}

interface GatedPage {
  name: string;
  locale: Locale;
  kind: PageKind;
  path: () => string;
}

const GATED: readonly GatedPage[] = [
  { name: 'en home', locale: 'en', kind: 'home', path: () => '/en' },
  { name: 'bn home', locale: 'bn', kind: 'home', path: () => '/bn' },
  { name: 'en r1', locale: 'en', kind: 'experience', path: () => `/en/experiences/${r1Id}` },
  { name: 'bn r1', locale: 'bn', kind: 'experience', path: () => `/bn/experiences/${r1Id}` },
];

for (const gated of GATED) {
  test(`NFR13 ${gated.name}`, async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT_MS);
    const url = `${E2E_ORIGIN}${gated.path()}`;

    const runs: FlowRun[] = [];
    const noLcpRetries: NoLcpRetry[] = [];
    for (let run = 0; run < RUNS; run += 1) {
      // Sequential on purpose: one flow at a time on the machine.
      runs.push(await withNoLcpRetries(noLcpRetries, run, () => measureFlow(url, gated.kind)));
    }

    const medians = {
      lcpMs: median(runs.map((entry) => entry.lcpMs)),
      cls: median(runs.map((entry) => entry.cls)),
      inpMs: median(runs.map((entry) => entry.inpMs)),
    };

    const selectors = [
      ...new Set(runs.map((entry) => entry.lcpSelector).filter((s): s is string => s !== null)),
    ];
    const probes: LcpProbe[] = [];
    for (const selector of selectors) {
      probes.push(await probeLcpElement(page, url, selector));
    }

    writeRecord(gated.name.replace(' ', '-'), {
      page: gated.path(),
      url,
      throttling: MOBILE_THROTTLING,
      thresholds: THRESHOLDS,
      runs,
      noLcpRetries,
      medians,
      lcpElementProbes: probes,
      measuredAt: new Date().toISOString(),
    });

    expect(
      selectors.length,
      'Lighthouse names the LCP element in at least one run',
    ).toBeGreaterThan(0);
    for (const probe of probes) {
      expect(probe.found, `LCP element ${probe.selector} exists at the first frame`).toBe(true);
      expect(probe.animations, `LCP element ${probe.selector} is never animated`).toBe(0);
      expect(probe.revealAncestor, `LCP element ${probe.selector} is not under [data-reveal]`).toBe(
        false,
      );
      expect(probe.opacity, `LCP element ${probe.selector} is fully opaque at first frame`).toBe(1);
    }

    expect(medians.lcpMs, 'median LCP (ms)').toBeLessThanOrEqual(THRESHOLDS.lcpMs);
    expect(medians.cls, 'median CLS').toBeLessThanOrEqual(THRESHOLDS.cls);
    expect(medians.inpMs, 'median INP (ms)').toBeLessThanOrEqual(THRESHOLDS.inpMs);
  });
}

interface RecordOnlyPage {
  name: string;
  path: () => string;
}

const RECORD_ONLY: readonly RecordOnlyPage[] = [
  { name: 'bn doctor profile', path: () => `/bn/doctors/${doctorId}` },
  { name: 'bn facility', path: () => `/bn/facilities/${facilityId}` },
  { name: 'bn topics', path: () => '/bn/topics' },
  { name: 'bn register', path: () => '/bn/register' },
  { name: 'en doctors', path: () => '/en/doctors' },
];

// BR5.6: one navigation run each, recorded against the reference, never gated. A figure over the
// reference becomes an S3 row at Build and Test; the record carries `overReference` for that.
for (const entry of RECORD_ONLY) {
  test(`NFR13 record ${entry.name}`, async () => {
    test.setTimeout(PAGE_TIMEOUT_MS);
    const url = `${E2E_ORIGIN}${entry.path()}`;
    const noLcpRetries: NoLcpRetry[] = [];
    const run = await withNoLcpRetries(noLcpRetries, 0, () => measureNavigation(url));
    writeRecord(`record-${entry.name.replaceAll(' ', '-')}`, {
      page: entry.path(),
      url,
      throttling: MOBILE_THROTTLING,
      referenceMs: REFERENCE_MS,
      run,
      noLcpRetries,
      overReference: run.lcpMs > REFERENCE_MS,
      measuredAt: new Date().toISOString(),
    });
    expect(run.lcpMs, 'a measured LCP').toBeGreaterThan(0);
  });
}
