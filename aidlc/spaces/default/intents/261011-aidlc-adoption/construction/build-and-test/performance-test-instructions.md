# Performance test instructions — RogiKotha release 1

The active Test Strategy is Minimal, but NFR13 (FD-091) sets gated performance targets and NFR1
asks for recorded figures, so this file records how they are measured. There is no load test: the
demo is a single local composition with no throughput or concurrency target (NFR3: no SLA).

## Targets

| Target | Pages | Expected | Gate |
|---|---|---|---|
| NFR13 / AC2.4.6 (FD-091) | `/en` and `/bn` home, `/en` and `/bn` experience page of the seeded review r1 | median of 5 Lighthouse flows: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1; the LCP element is never animated in | gated: a failing median fails the test |
| NFR13 search page | `/en` and `/bn` search | the same | deferred to release 2 with search (T-206, FD-105) |
| NFR1 / AC2.3.6 / AC12.3.5 | the record-only pages in `apps/web/e2e/perf/nfr13.spec.ts` (`RECORD_ONLY`) | figures recorded against the ~3 s reference, no pass/fail; a page over 3 s becomes an S3 `ISS-` row (BR5.6) | record only |
| NFR13 motion | both stylesheets | animated properties are only `transform` and `opacity` | `pnpm check:motion` (M1 to M11), inside `pnpm check` |

## Framework and configuration

- Playwright project `nfr13` (`apps/web/playwright.config.ts`, `retries: 0`), spec
  `apps/web/e2e/perf/nfr13.spec.ts`, Lighthouse user flows in `apps/web/e2e/perf/lighthouse-flow.ts`
  driven through `puppeteer-core` on the Playwright Chromium.
- Throttling (`MOBILE_THROTTLING`): a mid-range Android profile, slow 4G (RTT 150 ms, 1.6 Mbps
  down; the DevTools-throttled interaction step uses 562.5 ms latency, 1.47 Mbps down, 675 Kbps
  up) and 4x CPU slowdown.
- The flow per gated page: a navigation step (LCP, CLS) and a timespan step with an interaction
  (INP), five runs, median taken; the LCP element is probed for an entry animation.
- The suite's production build, the `rogikotha_e2e_test` database and port 3107, as in
  `integration-test-instructions.md`. The spec runs serially in one worker.

## How to run

```bash
pnpm e2e:perf                           # builds web and worker, then the nfr13 project
pnpm e2e:perf --grep "<page>"           # manual rerun of one page on an idle machine (BR5.5)
```

Run on an idle machine: other browser suites, builds or test runs load the CPU and skew the
figures. The measured values are written to `apps/web/test-results/nfr13/<page>.json` (gated) and
`record-<page>.json` (record only), with the throttling profile and the time of measurement.

## Regression detection

The gate is the thresholds above, never lowered. A failing median is rerun once by hand; a second
failure is a defect against the Unit that owns the page (U47 experience page, T-207 home) and an
`ISS-` row.
