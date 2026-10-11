#!/usr/bin/env node
/**
 * tools/sync-tokens.mjs
 *
 *   node tools/sync-tokens.mjs          # regenerate ui-design-prototype/shared/tokens.css
 *   node tools/sync-tokens.mjs --check  # exit 1 if tokens.css is stale (used by pnpm tools:check)
 *
 * WHY
 * ---
 * The patient app and the staff console shipped with two unrelated token
 * sets: different accent, different rules, a 13.5px admin body against a
 * 16px patient body, Inter named in one and not the other. Every design fix
 * landed in one and not the other, and side by side they read as two
 * products.
 *
 * The SOURCE OF TRUTH is the Concept 04b block of the patient stylesheet
 * (FD-027). This tool lifts every top-level `:root ...` block and every
 * `@media (prefers-color-scheme: dark)` block between the "Concept 04b
 * identity" header and the "Motion" header — light tokens, dark tokens,
 * semantic role hooks, colour schemes — into shared/tokens.css, which the
 * admin loads BEFORE its own stylesheet. Component rules are not copied.
 *
 * Nothing is hand-maintained twice: edit the patient stylesheet, run this.
 * Zero dependencies.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css');
const OUT = join(ROOT, 'ui-design-prototype/shared/tokens.css');
const CHECK = process.argv.includes('--check');

const css = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');

// Region: from the first ":root {" after the 04b identity header, up to the
// comment block that introduces the motion section.
const idHdr = css.indexOf('Concept 04b identity');
if (idHdr < 0) throw new Error('04b identity header not found');
const regionStart = css.indexOf('\n:root {', idHdr) + 1;
const motion = css.indexOf('   Motion (CSS-only');
if (motion < 0) throw new Error('motion header not found');
const regionEnd = css.lastIndexOf('/* ====', motion);
const region = css.slice(regionStart, regionEnd);

// Walk top-level blocks with brace matching; keep only token-bearing ones.
const kept = [];
let i = 0, lastEnd = 0;
while (i < region.length) {
  const open = region.indexOf('{', i);
  if (open < 0) break;
  // selector = text since the previous block, minus comments
  const rawSel = region.slice(lastEnd, open);
  const sel = rawSel.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  let depth = 1, j = open + 1;
  while (j < region.length && depth) { if (region[j] === '{') depth++; else if (region[j] === '}') depth--; j++; }
  const body = region.slice(open, j);
  if (/^:root/.test(sel) || /^@media \(prefers-color-scheme/.test(sel)) {
    kept.push(sel + ' ' + body.trim());
  }
  lastEnd = j; i = j;
}
if (!kept.length) throw new Error('no token blocks found');

const out = `/* ==========================================================================
   RogiKotha design tokens — GENERATED, do not edit.

   Source: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css
           (the Concept 04b identity block, FD-027).
   Regenerate: node tools/sync-tokens.mjs      Verify: pnpm tools:check

   Loaded by the staff console before its own stylesheet so both apps share
   one palette, one type stack, one set of rules and surface tiers, in light
   and dark. The patient app does not load this file: it IS the source.
   ========================================================================== */

${kept.join('\n\n')}
`;

if (CHECK) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== out) {
    console.log('tokens.css is STALE — run: node tools/sync-tokens.mjs');
    process.exit(1);
  }
  console.log(`tokens.css is in sync (${kept.length} token blocks).`);
} else {
  writeFileSync(OUT, out, 'utf8');
  console.log(`wrote shared/tokens.css — ${kept.length} token blocks, ${out.split('\n').length} lines`);
  kept.forEach(k => console.log('  · ' + k.split('\n')[0].slice(0, 60)));
}
