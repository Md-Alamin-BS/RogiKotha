// One-shot i18n audit: list i18n keys defined in shared/rogikotha-data.js
// versus those referenced via T('foo') or data-i18n="foo" in the prototype tree.
// Usage: node tools/i18n-audit.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('ui-design-prototype');
const dataPath = path.join(ROOT, 'shared', 'rogikotha-data.js');
const d = fs.readFileSync(dataPath, 'utf8');

// Defined keys: pattern matches 'foo.bar': { en: ..., bn: ... }
// Keys in this codebase are always lowercase + dot, no trailing dot.
const defined = new Set();
const defRe = /'([a-z][a-z0-9.\-]*)'\s*:\s*\{\s*en\s*:/g;
let m;
while ((m = defRe.exec(d))) defined.add(m[1]);

// Walk prototype tree and gather references. Track references against
// each i18n table separately: T() against `defined`, VT() against the
// local viewer table inside concept-04b's app.js.
const refs = new Set();
const viewerRefs = new Set();
const localViewerTables = []; // { file, tableName, defined:Set }

function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const q = path.join(p, e.name);
    if (e.isDirectory()) walk(q);
    else if (/\.(js|html)$/.test(e.name)) {
      const s = fs.readFileSync(q, 'utf8');
      const tRe = /\b([A-Z][A-Z0-9_]*)\(\s*['"]([a-z][a-z0-9.\-]*)['"]\s*(\+|\))/g;
      while ((m = tRe.exec(s))) {
        const fn = m[1];
        const key = m[2];
        const followedByConcat = m[3] === '+';
        const endsWithEmptySegment = /[.]$/.test(key);
        if (followedByConcat || endsWithEmptySegment) continue;
        if (fn === 'T') refs.add(key);
        else if (fn === 'VT') viewerRefs.add(key);
      }
      // Only data-i18n on its own (without -attr suffix) is an i18n key.
      // data-i18n-attr="title" declares the *attribute name* to translate into.
      const aRe = /(?<![a-z\-])data-i18n="([a-z][a-z0-9.\-]*)"/g;
      while ((m = aRe.exec(s))) refs.add(m[1]);
      // Capture local i18n tables: ANYTHING_X_STRINGS = { ... }
      // Walk braces to find the matching closing brace.
      const tableRe = /\b([A-Z][A-Z0-9_]*STRINGS)\s*=\s*\{/g;
      let tm;
      while ((tm = tableRe.exec(s))) {
        const tableName = tm[1];
        let depth = 1;
        let i = tm.index + tm[0].length;
        while (i < s.length && depth > 0) {
          const ch = s[i];
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          i++;
        }
        if (depth !== 0) continue;
        const body = s.slice(tm.index + tm[0].length, i - 1);
        const tDef = new Set();
        body.replace(/\b([A-Za-z][A-Za-z0-9.\-]*)\s*:\s*\{\s*en\s*:/g, (_, k) => tDef.add(k));
        localViewerTables.push({ file: q, tableName, defined: tDef });
      }
    }
  }
}
walk(ROOT);

const missing = [];
for (const k of refs) if (!defined.has(k)) missing.push(k);

const viewerMissing = [];
const viewerDefined = new Set();
for (const t of localViewerTables) for (const k of t.defined) viewerDefined.add(k);
for (const k of viewerRefs) if (!viewerDefined.has(k)) viewerMissing.push(k);

const unused = [];
for (const k of defined) if (!refs.has(k)) unused.push(k);

console.log('-- Shared i18n (T() / data-i18n) --');
console.log('Defined keys:', defined.size);
console.log('Referenced keys:', refs.size);
console.log('Missing (referenced, undefined):', missing.length ? missing.join(', ') : 'none');
console.log('Unused (defined, never referenced, sample):',
  unused.length ? unused.slice(0, 40).join(', ') + (unused.length > 40 ? ` …+${unused.length - 40} more` : '') : 'none');
console.log();
console.log('-- Local viewer tables (VT() references) --');
console.log('Tables:', localViewerTables.map(t => t.tableName).join(', ') || 'none');
console.log('Defined viewer keys:', viewerDefined.size);
console.log('Referenced viewer keys:', viewerRefs.size);
console.log('Missing viewer (referenced, undefined):',
  viewerMissing.length ? viewerMissing.join(', ') : 'none');
