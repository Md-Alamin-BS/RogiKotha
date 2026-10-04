#!/usr/bin/env node
/**
 * tools/check-detector.mjs — run the impeccable detector, drop documented
 * false-positives, exit non-zero only on residual real findings.
 *
 *   node tools/check-detector.mjs        # or: invoked by `pnpm tools:check`
 *
 * Why this exists: the static detector emits 3 documented false-positive
 * findings on the current `main` (per
 * `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md`):
 *
 *   1. `admin/index.html` — `[low-contrast] :hover state 1.0:1`. The static
 *      CSS scan can't follow `:hover` resolution; `tools/hover-probe.mjs`
 *      confirms the bug is fixed in the live browser (0 LOW-contrast hover
 *      states after the 2026-09-10 fix).
 *
 *   2. `admin/styles.css:343` — `[side-tab] border-inline-start: 3px solid`.
 *      The `.case-row` indicator uses the `transparent` keyword on the
 *      default state and fills on `:has(.case[aria-pressed="true"])`.
 *      Documented as a detector limitation in the same critique.
 *
 *   3. `concepts/concept-04b-quiet-clinic-minimal/styles.css:1797` —
 *      `[side-tab] border-left: 4px solid var(--rule-strong)`. The
 *      intentional NHS callout-keyline pattern (comment-documented in
 *      source, contrast-verified by `tools/contrast.mjs`).
 *
 * Exit codes:
 *   0 = real findings empty (known false positives filtered)
 *   2 = at least one REAL finding after filtering
 *
 * Reversible in one commit: delete this file and revert `package.json`.
 */
import { spawnSync } from 'node:child_process';

const KNOWN_FALSE_POSITIVES = [
  {
    file: 'ui-design-prototype/admin/index.html',
    line: 0,
    antipattern: 'low-contrast',
    snippet: ':hover state 1.0:1',
    why: 'static CSS scan cannot follow :hover resolution; live verification by tools/hover-probe.mjs',
  },
  {
    file: 'ui-design-prototype/admin/styles.css',
    line: 343,
    antipattern: 'side-tab',
    snippet: 'border-inline-start: 3px solid',
    why: '.case-row default-state uses the `transparent` keyword; fills on :has(.case[aria-pressed="true"]) at :362',
  },
  {
    file: 'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css',
    line: 1797,
    antipattern: 'side-tab',
    snippet: 'border-left: 4px solid var(--rule-strong)',
    why: 'intentional NHS callout-keyline pattern (source-comment at :1792-1796); contrast verified by tools/contrast.mjs',
  },
];

const TARGET = 'ui-design-prototype';

const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/^.*?ui-design-prototype\//, '');

const result = spawnSync('npx --yes impeccable detect ' + TARGET + ' --no-advisory --json', { encoding: 'utf8', shell: true });
if (result.error || result.status === null) {
  console.error('impeccable detector failed to run: ' + (result.error?.message || 'no status'));
  process.exit(2);
}

let findings;
try { findings = JSON.parse(result.stdout || '[]'); }
catch (e) {
  console.error('impeccable detector emitted non-JSON output:');
  console.error(result.stdout);
  process.exit(2);
}

// Match by (dir + filename + antipattern + snippet-substring) with a small
// line-drift tolerance. Line numbers rot the moment anyone inserts code
// above the cited line; the snippet is the stable anchor (cf.
// `tools/proof-check.mjs`'s use of anchors for the same reason).
const isFalsePositive = (f) => {
  const file = norm(f.file || '');
  return KNOWN_FALSE_POSITIVES.some(k => {
    if (k.antipattern !== f.antipattern) return false;
    const kFile = norm(k.file);
    if (!file.endsWith(kFile)) return false;
    // Line drift tolerance: ±2 lines.
    if (k.line !== 0 && Math.abs(k.line - f.line) > 2) return false;
    // Snippet substring (the detector emits a truncated match; the seed string
    // in the constant must be a fragment that survives any re-formatting).
    if (k.snippet && !(f.snippet || '').includes(k.snippet)) return false;
    return true;
  });
};

const real  = findings.filter(f => !isFalsePositive(f));
const noise = findings.filter(isFalsePositive);

for (const f of noise) {
  console.error('[impeccable:filtered-false-positive] ' + f.antipattern + ' at ' + f.file + ':' + f.line + ' — see .impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md');
}

if (real.length === 0) {
  console.log('impeccable: 0 findings (' + noise.length + ' filtered as documented false-positives)');
  process.exit(0);
}

console.error('impeccable: ' + real.length + ' REAL finding(s):');
for (const f of real) console.error('  ' + f.antipattern + ' — ' + f.file + ':' + f.line + ' — ' + (f.snippet || ''));
process.exit(2);
