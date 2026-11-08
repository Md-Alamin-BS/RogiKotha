import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { chromium } from '@playwright/test';
import type { startFlow } from 'lighthouse';

import { resultsDir } from '../helpers/env';

// BR5.2, BR5.3: one Lighthouse user flow per call. The page Lighthouse drives comes from its own
// bundled puppeteer-core (never a root copy, so the Page matches the version Lighthouse declares),
// launched on Playwright's Chromium build.

/** NFR13: slow 4G and a 4x slower CPU (Lighthouse's mobile defaults). */
export const MOBILE_THROTTLING = {
  rttMs: 150,
  throughputKbps: 1638.4,
  cpuSlowdownMultiplier: 4,
  // ASSUMPTION(U50): the DevTools-throttling fields use Lighthouse's own derivation of the same
  // network (latency x 3.75, throughput x 0.9, upload 675 Kbps), so both steps share one network.
  requestLatencyMs: 562.5,
  downloadThroughputKbps: 1474.56,
  uploadThroughputKbps: 675,
} as const;

export type PageKind = 'home' | 'experience';

export interface NavigationRun {
  lcpMs: number;
  cls: number;
  /** The selector Lighthouse gives the largest contentful paint element, when it names one. */
  lcpSelector: string | null;
  benchmarkIndex: number | null;
}

export interface FlowRun extends NavigationRun {
  inpMs: number;
}

interface PuppeteerPage {
  click(selector: string): Promise<void>;
  focus(selector: string): Promise<void>;
  $(selector: string): Promise<unknown>;
  evaluate(script: () => Promise<void>): Promise<void>;
  goto(url: string): Promise<unknown>;
}

/** ISS-815: Lighthouse lost the measured navigation's `navigationStart` (`NO_NAVSTART`). */
export class NoLcpError extends Error {
  constructor(
    url: string,
    readonly reason: string,
    readonly report: string,
  ) {
    super(`Lighthouse reported no LCP for ${url}: ${reason}`);
    this.name = 'NoLcpError';
  }
}

interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}

interface PuppeteerModule {
  launch(options: {
    executablePath: string;
    headless: boolean;
    args: string[];
  }): Promise<PuppeteerBrowser>;
}

interface AuditResult {
  numericValue?: number;
  notApplicable?: boolean;
  scoreDisplayMode?: string;
  details?: unknown;
  errorMessage?: string;
  warnings?: string[];
}

interface StepResult {
  lhr: {
    audits: Record<string, AuditResult | undefined>;
    environment?: { benchmarkIndex?: number };
    runWarnings?: string[];
  };
}

type FlowPage = Parameters<typeof startFlow>[0];

const nodeRequire = createRequire(import.meta.url);

function lighthouseOwnPuppeteer(): PuppeteerModule {
  const fromLighthouse = createRequire(nodeRequire.resolve('lighthouse/package.json'));
  return fromLighthouse('puppeteer-core') as PuppeteerModule;
}

async function launch(): Promise<PuppeteerBrowser> {
  return lighthouseOwnPuppeteer().launch({
    executablePath: chromium.executablePath(),
    headless: true,
    // The container-style sandbox is not needed for a local, synthetic-data run.
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

function metric(step: StepResult, id: string): number | null {
  const audit = step.lhr.audits[id];
  if (!audit || audit.notApplicable === true || audit.scoreDisplayMode === 'notApplicable')
    return null;
  return typeof audit.numericValue === 'number' ? audit.numericValue : null;
}

/** The first `node.selector` in the LCP element audit's details, however the tables are nested. */
export function firstNodeSelector(details: unknown): string | null {
  if (Array.isArray(details)) {
    for (const entry of details) {
      const found = firstNodeSelector(entry);
      if (found) return found;
    }
    return null;
  }
  if (details && typeof details === 'object') {
    const record = details as Record<string, unknown>;
    // Lighthouse 13 insights list the node item itself, not under a `node` key (ISS-812).
    if (
      record['type'] === 'node' &&
      typeof record['selector'] === 'string' &&
      record['selector'] !== ''
    )
      return record['selector'];
    const node = record['node'];
    if (node && typeof node === 'object') {
      const selector = (node as Record<string, unknown>)['selector'];
      if (typeof selector === 'string' && selector !== '') return selector;
    }
    for (const value of Object.values(record)) {
      const found = firstNodeSelector(value);
      if (found) return found;
    }
  }
  return null;
}

function readNavigation(step: StepResult, url: string): NavigationRun {
  const lcpMs = metric(step, 'largest-contentful-paint');
  const cls = metric(step, 'cumulative-layout-shift');
  if (lcpMs === null) throw new Error(`Lighthouse reported no LCP for ${url}`);
  if (cls === null) throw new Error(`Lighthouse reported no CLS for ${url}`);
  return {
    lcpMs,
    cls,
    // Lighthouse 13 moved the LCP node to `lcp-breakdown-insight` (ISS-812).
    lcpSelector:
      firstNodeSelector(step.lhr.audits['lcp-breakdown-insight']?.details) ??
      firstNodeSelector(step.lhr.audits['largest-contentful-paint-element']?.details),
    benchmarkIndex: step.lhr.environment?.benchmarkIndex ?? null,
  };
}

interface TraceEvent {
  name: string;
  ts?: number;
  args?: { frame?: string; data?: Record<string, unknown> };
}

const PAINT_EVENT =
  /LargestContentfulPaint|firstContentfulPaint|firstPaint|navigationStart|TracingStartedInBrowser/;

/** ISS-815: the run Lighthouse gave no LCP, kept with the trace's paint events to find why. */
function writeNoLcpReport(url: string, step: StepResult, artifacts: unknown): string {
  const lcp = step.lhr.audits['largest-contentful-paint'];
  const gather =
    (artifacts as { gatherSteps?: { artifacts?: { Trace?: { traceEvents?: TraceEvent[] } } }[] })
      .gatherSteps?.[0]?.artifacts?.Trace?.traceEvents ?? [];
  const events = gather
    .filter((event) => PAINT_EVENT.test(event.name))
    .map((event) => ({
      name: event.name,
      ts: event.ts,
      frame: event.args?.frame,
      data: event.args?.data,
    }));
  const folder = path.join(resultsDir(), 'nfr13', 'no-lcp');
  mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(
    file,
    `${JSON.stringify({ url, lcpAudit: lcp, runWarnings: step.lhr.runWarnings, traceEvents: gather.length, events }, null, 2)}\n`,
  );
  return file;
}

/** Throws `NoLcpError`, with the kept report, when the navigation step has no LCP value. */
function assertLcp(url: string, step: StepResult, artifacts: unknown): void {
  if (metric(step, 'largest-contentful-paint') !== null) return;
  const report = writeNoLcpReport(url, step, artifacts);
  const reason = step.lhr.audits['largest-contentful-paint']?.errorMessage ?? 'no LCP value';
  throw new NoLcpError(url, reason, report);
}

/**
 * ISS-815: a fresh tab starts on an initial about:blank; the first navigation away from it lost
 * its `navigationStart` in the trace. Opening the origin first makes the measured navigation a
 * same-site one. `/api/health` carries no page asset, and the flow's first navigation still
 * resets storage.
 */
async function openOrigin(page: PuppeteerPage, url: string): Promise<void> {
  await page.goto(new URL('/api/health', url).href);
}

/** Two animation frames: the interaction has painted, and no clock is involved. */
async function afterNextPaint(page: PuppeteerPage): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * BR5.3. Home: the theme toggle twice, then the language control. Experience: the theme toggle
 * twice, then the first disclosure.
 * ASSUMPTION(U50): the language control is a link to the other locale (`a#lang`), not a menu, so
 * it is focused, never pressed (a press would leave the page being measured); a page without a
 * `<details>` focuses it too.
 */
async function interact(page: PuppeteerPage, kind: PageKind): Promise<void> {
  await page.click('#theme');
  await afterNextPaint(page);
  await page.click('#theme');
  await afterNextPaint(page);
  if (kind === 'experience' && (await page.$('details > summary')) !== null) {
    await page.click('details > summary');
  } else {
    await page.focus('a#lang');
  }
  await afterNextPaint(page);
}

/** BR5.2: navigation (simulated throttling) then timespan (DevTools throttling) with an interaction. */
export async function measureFlow(url: string, kind: PageKind): Promise<FlowRun> {
  const lighthouse = await import('lighthouse');
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await openOrigin(page, url);
    // Lighthouse's default (mobile) config: none is passed.
    const flow = await lighthouse.startFlow(page as unknown as FlowPage, {
      name: `NFR13 ${kind}`,
    });
    await flow.navigate(url, {
      name: 'navigation',
      throttlingMethod: 'simulate',
      throttling: MOBILE_THROTTLING,
    });
    await flow.startTimespan({
      name: 'interaction',
      throttlingMethod: 'devtools',
      throttling: MOBILE_THROTTLING,
    });
    await interact(page, kind);
    await flow.endTimespan();

    const [navigation, timespan] = (await flow.createFlowResult()).steps as unknown as StepResult[];
    if (!navigation || !timespan)
      throw new Error('The Lighthouse flow returned fewer than 2 steps');
    assertLcp(url, navigation, flow.createArtifactsJson());
    const inpMs = metric(timespan, 'interaction-to-next-paint');
    if (inpMs === null) {
      throw new Error(`No interaction was measured on ${url}: INP is not applicable (BR5.3)`);
    }
    return { ...readNavigation(navigation, url), inpMs };
  } finally {
    await browser.close();
  }
}

/** BR5.6: one navigation step, no interaction. */
export async function measureNavigation(url: string): Promise<NavigationRun> {
  const lighthouse = await import('lighthouse');
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await openOrigin(page, url);
    const flow = await lighthouse.startFlow(page as unknown as FlowPage, { name: 'NFR13 record' });
    await flow.navigate(url, {
      name: 'navigation',
      throttlingMethod: 'simulate',
      throttling: MOBILE_THROTTLING,
    });
    const [navigation] = (await flow.createFlowResult()).steps as unknown as StepResult[];
    if (!navigation) throw new Error('The Lighthouse flow returned no step');
    assertLcp(url, navigation, flow.createArtifactsJson());
    return readNavigation(navigation, url);
  } finally {
    await browser.close();
  }
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('median of no values');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const low = sorted[middle - 1] as number;
  const high = sorted[middle] as number;
  return sorted.length % 2 === 1 ? high : (low + high) / 2;
}
