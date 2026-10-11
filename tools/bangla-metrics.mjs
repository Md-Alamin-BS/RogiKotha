#!/usr/bin/env node
/**
 * tools/bangla-metrics.mjs
 *
 *   node tools/bangla-metrics.mjs      # or: pnpm tools:bangla
 *
 * Bengali needs a taller line box than Latin: the vowel signs and the matra
 * sit above the ascender line, so Latin-tight leading clips them and a
 * fixed-height box crops them.
 *
 * The staff console shipped exactly that bug — it scoped --lh-ui and
 * --lh-prose to [data-lang="bn"] but forgot --lh-tight, which every h1-h4
 * uses, so the queue lane heads (জরুরি / সাধারণ / আপিল) were cut off along
 * the top. `.badge` had the same problem from the other direction: a fixed
 * height: 20px around 13px text.
 *
 * Static check over the stylesheets, so it needs no browser:
 *   1. every leading token below MIN is raised under [data-lang="bn"]
 *   2. no literal line-height below MIN on a text rule, unless that same
 *      selector is given a Bengali override somewhere
 *   3. no fixed `height:` on a rule that also sets a font-size
 *
 * Zero dependencies. Exits non-zero on a finding.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIN = 1.4;
const FILES = [
  'ui-design-prototype/admin/styles.css',
  'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css',
];

// Glyphs that are legitimately alone in a fixed box, or decorative rules.
// A rule may opt out with `/* bangla-ok: <why> */` in its body. Use it only
// where the box holds a GLYPH or a numeral rather than Bengali words - an
// avatar circle, a count badge, an icon control.
const OPT_OUT = /bangla-ok/;

const findings = [];

for (const rel of FILES) {
  const css = readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
    sel: m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().split('\n').pop().trim(),
    body: m[2],
  }));

  // Selectors that DO get a Bengali line-height somewhere.
  const bnFixed = new Set();
  for (const r of rules) {
    if (!r.sel.includes('[data-lang="bn"]')) continue;
    if (!/line-height/.test(r.body)) continue;
    const bare = r.sel.replace(/html\[data-lang="bn"\]\s*/, '').trim();
    bnFixed.add(bare);
    // ":is(h1,h2,h3,h4)" also covers each tag on its own
    const isList = /:is\(([^)]+)\)/.exec(bare);
    if (isList) isList[1].split(',').forEach((t) => bnFixed.add(t.trim()));
  }

  // 1. leading tokens
  const bnTokenBlocks = rules.filter((r) => r.sel.includes('[data-lang="bn"]')).map((r) => r.body).join(';');
  for (const m of css.matchAll(/^\s*(--lh-[\w-]+)\s*:\s*([\d.]+)/gm)) {
    const [, tok, val] = m;
    if (Number(val) >= MIN) continue;
    const bn = new RegExp(tok + '\\s*:\\s*([\\d.]+)').exec(bnTokenBlocks);
    if (!bn) findings.push(`${rel}: ${tok} is ${val} and is never raised under [data-lang="bn"]`);
    else if (Number(bn[1]) < MIN) findings.push(`${rel}: ${tok} is ${bn[1]} under [data-lang="bn"], below ${MIN}`);
  }

  // 2 + 3. per-rule
  for (const { sel, body } of rules) {
    // Test PROPERTIES on comment-stripped text: a comment that merely
    // mentions `height:20px` is not a declaration. OPT_OUT still reads the
    // raw body, because the marker lives in a comment.
    const decl = body.replace(/\/\*[\s\S]*?\*\//g, '');
    if (!sel || sel.startsWith('@') || sel.startsWith(':root') || sel.includes('[data-lang="bn"]')) continue;

    const lh = /line-height:\s*([\d.]+)\s*[;}]?/.exec(decl);
    // "h1, h2, h3, h4" is covered when each tag has a Bengali override.
    const parts = sel.split(',').map((x) => x.trim()).filter(Boolean);
    const covered = parts.length > 0 && parts.every((x) => bnFixed.has(x));
    if (lh && Number(lh[1]) < MIN && /font-size|font-family/.test(decl) && !covered && !OPT_OUT.test(body)) {
      findings.push(`${rel}: "${sel}" sets line-height ${lh[1]} on text, with no Bengali override`);
    }

    if (/(?:^|;|\s)height:\s*\d+px/.test(decl) && /font-size:/.test(decl) && !OPT_OUT.test(body)) {
      findings.push(`${rel}: "${sel}" sets a fixed height AND a font-size — use min-height so Bengali can grow it`);
    }
  }
}

if (findings.length) {
  console.log('Bengali metric findings:\n  ' + findings.join('\n  '));
  console.log(`\nFAIL: ${findings.length} finding(s).`);
  process.exit(1);
}
console.log(`OK - heading leading is >= ${MIN} in Bengali and no text box has a fixed height.`);
