#!/usr/bin/env node
/**
 * tools/proof-check.mjs
 *
 *   node tools/proof-check.mjs          # verify (exit 1 on drift)
 *   node tools/proof-check.mjs --fix    # rewrite drifted line numbers in place
 *
 * WHY THIS EXISTS
 * ---------------
 * 09-coverage-matrix.md cites proof as `path/to/file.js:1234`. Line numbers rot
 * the moment anyone inserts code above them, and nothing noticed: coverage.mjs
 * only checks that the *file* exists. A matrix full of confidently wrong line
 * numbers is worse than one with none, because readers trust it.
 *
 * THE CONVENTION
 * --------------
 * Write a citation as:      `path/to/file.js:1234 anchorText`
 * where `anchorText` is a string that literally appears on that line — a
 * function name, an id, a `STORY-XYZ` marker comment. The anchor is the source
 * of truth; the line number is derived and this tool maintains it.
 *
 * A citation with no anchor cannot be verified. Those are reported so they can
 * be given one. Prefer the `// STORY-XYZ:` marker comments already used
 * throughout ui-design-prototype/ — they are stable and self-documenting.
 *
 * Zero npm dependencies.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MATRIX = join(ROOT, 'docs/planning/09-coverage-matrix.md');
const FIX = process.argv.includes('--fix');
const ANCHOR = process.argv.includes('--anchor');

// `path:line[-line][ anchor]` inside backticks.
const CITE = /`([A-Za-z0-9_./-]+\.(?:js|css|html|mjs)):(\d+)(?:-(\d+|\b))?([^`]*)`/g;

let md = readFileSync(MATRIX, 'utf8');
const lines = md.split(/\r?\n/);

// Shorthand paths (`app.js:292`, `shared/rogikotha-data.js:1419`) are written
// relative to several different bases depending on the row. Try each.
const BASES = [
  '',
  'ui-design-prototype/',
  'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/',
  'ui-design-prototype/admin/',
  'docs/planning/',
];
function expand(p, lastFull) {
  const tries = [p];
  // The row's own preceding full path wins: "app.js:171" after an admin
  // citation means admin/app.js, not whichever app.js a generic base finds.
  if (lastFull) {
    const d = dirname(lastFull).split(String.fromCharCode(92)).join('/');
    tries.push(d + '/' + p);
  }
  for (const b of BASES) tries.push(b + p);
  for (const t of tries) if (existsSync(resolve(ROOT, t))) return t;
  return null;
}

// --anchor: derive an anchor from the cited line so the citation becomes
// self-verifying. Only emits anchors that are literally on the line and
// reasonably distinctive, so a wrong guess cannot slip in silently.
function deriveAnchor(file, line) {
  let src;
  try { src = readFileSync(resolve(ROOT, file), 'utf8').split(/\r?\n/); } catch { return null; }
  const raw = src[line - 1];
  if (!raw) return null;
  const distinct = (t) => (t && src.filter((s) => s.includes(t)).length <= 6 ? t : null);
  let m;
  if ((m = raw.match(/(?:\/\/|<!--|\/\*)\s*(STORY-[A-Z]+-\d+|NFR-\d+|FR-[A-Z]+-\d+)/))) return m[1];
  if ((m = raw.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/))) return m[1] + '()';
  if ((m = raw.match(/id="([^"]+)"/))) return distinct('id="' + m[1] + '"');
  if ((m = raw.match(/(data-[a-z-]+)=/))) return distinct(m[1]);
  if ((m = raw.match(/^\s*(--[\w-]+)\s*:/))) return distinct(m[1]);
  if ((m = raw.match(/^\s*(@media[^{]+)\{/))) return distinct(m[1].trim());
  if ((m = raw.match(/^\s*(\.[A-Za-z][\w-]*)\s*[,{]/))) return distinct(m[1]);
  if ((m = raw.match(/'([a-z][\w]*\.[\w.]+)'/))) return distinct(m[1]);
  if ((m = raw.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*[[{]/))) return distinct(m[1]);
  if ((m = raw.match(/(?:var|const|let)\s+([A-Za-z_$][\w$]*)/))) return distinct(m[1]);
  if ((m = raw.match(/<(section|nav|main|header|footer|table)[^>]*class="([^"]+)"/))) return distinct('class="' + m[2] + '"');
  if ((m = raw.match(/class="([A-Za-z][\w-]*)"/))) return distinct('class="' + m[1] + '"');
  if ((m = raw.match(/\$\'(#[\w-]+)\'\)/))) return distinct("$('" + m[1] + "')");
  if ((m = raw.match(/\bRK\.([A-Za-z_$][\w$]*)/))) return distinct('RK.' + m[1]);
  if ((m = raw.match(/T\('([\w.]+)'\)/))) return distinct("T('" + m[1] + "')");
  return null;
}

// A citation pointing at a blank line is already wrong, whatever it once meant.
function isBlankLine(file, line) {
  try {
    const src = readFileSync(resolve(ROOT, file), 'utf8').split(/\r?\n/);
    return line <= src.length && !(src[line - 1] || '').trim();
  } catch { return false; }
}

const drift = [], missingFile = [], noAnchor = [], notFound = [], ok = [], anchored = [], blankLine = [];
const out = lines.map((line) => {
  // Only table rows carry proofs. Skipping prose keeps the convention
  // example in this file's own documentation from being read as a citation.
  if (!line.startsWith('|')) return line;
  let lastFull = null;
  return line.replace(CITE, (whole, p, l1, l2, rest) => {
    const path = expand(p, lastFull);
    if (existsSync(resolve(ROOT, p))) lastFull = p;
    if (!path) { missingFile.push(`${p} (row: ${line.slice(2, 40)}…)`); return whole; }
    // Drop ", 64" / ", 541-576" continuations - they name extra locations,
    // not an anchor.
    const anchor = (rest || '').replace(/^\s*(?:,\s*\d+(?:-\d+)?\s*)+/, '')
                               .trim().replace(/^[(\-–—]\s*/, '').split(/\s{2,}/)[0].trim();
    if (!anchor) {
      if (ANCHOR) {
        const derived = deriveAnchor(path, Number(l1));
        if (derived) { anchored.push(`${path}:${l1} ${derived}`);
          return '`' + path + ':' + l1 + (l2 ? '-' + l2 : '') + (rest || '') + ' ' + derived + '`'; }
      }
      if (isBlankLine(path, Number(l1))) { blankLine.push(`${path}:${l1}`); return whole; }
      noAnchor.push(`${path}:${l1}`); return whole;
    }

    const src = readFileSync(resolve(ROOT, path), 'utf8').split(/\r?\n/);
    // Anchors are usually literal. A dotted path like `thresholds.fiveAccountHide`
    // describes structure rather than one line, so fall back to its last segment.
    const candidates = [anchor.replace(/\(\)$/, '')];
    if (anchor.includes('.')) candidates.push(anchor.split('.').pop().replace(/\(\)$/, ''));
    let hits = [];
    for (const needle of candidates) {
      hits = []; src.forEach((s, i) => { if (s.includes(needle)) hits.push(i + 1); });
      if (hits.length) break;
    }
    if (!hits.length) { notFound.push(`${path}:${l1} anchor "${anchor}" not found`); return whole; }

    // Prefer the hit closest to the cited line, so repeated anchors stay stable.
    const want = Number(l1);
    const best = hits.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
    if (best === want) { ok.push(`${path}:${want}`); return whole; }
    drift.push(`${path}: cited ${want} -> actual ${best}  (anchor "${anchor}")`);
    const span = l2 ? `-${Number(l2) + (best - want)}` : '';
    return '`' + path + ':' + best + span + (rest || '') + '`';
  });
});

if ((FIX && drift.length) || (ANCHOR && anchored.length)) {
  writeFileSync(MATRIX, out.join('\n'), 'utf8');
}

const say = (t, a) => { if (a.length) console.log(`\n${t} (${a.length})\n  ` + a.join('\n  ')); };
console.log(`Verified citations: ${ok.length} correct, ${drift.length} drifted, ` +
            `${noAnchor.length} unanchored, ${notFound.length} anchor-not-found, ${missingFile.length} missing file`);
say(FIX ? 'FIXED — line numbers rewritten' : 'DRIFTED — run with --fix', drift);
say('ANCHOR NOT FOUND — the code moved or was deleted; check by hand', notFound);
say('MISSING FILE', missingFile);
say('POINTS AT A BLANK LINE - already wrong, re-cite by hand', blankLine);
say(ANCHOR ? 'ANCHORS ADDED' : 'ANCHORS ADDED', anchored);
say('UNANCHORED — cannot be verified; add an anchor after the line number', noAnchor);

const hard = notFound.length + missingFile.length + blankLine.length + (FIX ? 0 : drift.length);
if (hard) { console.log(`\nFAIL: ${hard} citation problem(s).`); process.exit(1); }
console.log('\nOK');
