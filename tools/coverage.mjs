#!/usr/bin/env node
/**
 * tools/coverage.mjs
 *
 * Story ↔ prototype coverage regenerator.
 *
 *   node tools/coverage.mjs
 *
 * Reads:
 *   - docs/planning/backlog.yaml       (story id + parent reference, structural)
 *   - docs/planning/09-coverage-matrix.md  (human-curated Status + Proof columns)
 *   - ui-design-prototype/_star__star_/*.html    (annotations: <!-- STORY-XYZ: ... -->)
 *   - ui-design-prototype/_star__star_/*.css     (annotations: block-comment STYLE)
 *   - ui-design-prototype/_star__star_/*.js      (annotations: // STORY-XYZ: ...)
 *
 * Output (stdout only — read-only):
 *   - a per-story rollup table (Story, Status, Proof, Annotated ✓/✗)
 *   - a final aggregate line:  Done: N (N%) · Partial: N (N%) · Missing: N (N%)
 *
 * Zero npm dependencies. Uses only Node built-ins (fs, path, url).
 * YAML parsing is intentionally structural: we only need the list of story IDs
 * from the `stories:` block of backlog.yaml, not a full YAML library.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKLOG = join(ROOT, 'docs/planning/backlog.yaml');
const MATRIX = join(ROOT, 'docs/planning/09-coverage-matrix.md');
const PROTOTYPE = join(ROOT, 'ui-design-prototype');

// Story ID looks like STORY-FOUND-001, FR-AUTH-001, NFR-006, TASK-FOUND-001-A,
// STORY-NFR-AA-HOVER-001. Permissive: STORY- with one or more [A-Z] segments
// (joined by '-') ending in digits; FR- same; NFR-\d+; TASK- same.
const STORY_ID_RE = /\b(?:STORY-(?:[A-Z]+(?:-[A-Z]+)*)-\d+|FR-[A-Z]+-\d+|NFR-\d+|TASK-[A-Z]+-\d+-?\w*)\b/g;

// ---------- helpers ----------

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(html|css|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// ---------- read sources ----------

function readText(p) {
  return readFileSync(p, 'utf8');
}

function parseStoryIdsFromYaml(yaml) {
  // We only need the unique `STORY-XXX-NNN` ids from the `stories:` block.
  const ids = new Set();
  const inStories = /^stories:/m.test(yaml);
  if (!inStories) return ids;
  // Cut off at the next top-level key (^<word>:) other than story entries.
  const block = yaml.split(/^stories:\s*$/m)[1] || '';
  const stopMatch = block.match(/^[a-zA-Z_]+:/m);
  const scoped = stopMatch ? block.slice(0, stopMatch.index) : block;
  const re = /id:\s*(STORY-[A-Z]+-\d+)/g;
  let m;
  while ((m = re.exec(scoped)) !== null) ids.add(m[1]);
  return ids;
}

function parseMatrixRows(md) {
  // Extract story rows from the markdown table in 09-coverage-matrix.md.
  // We rely on the file's stable shape: each row starts with "| **EPIC-...**
  // or "| STORY-XYZ | ...". We capture the Story id, the Status cell, the
  // Proof cell. Lines inside the rollup block (no `| Story |` header) are skipped.
  const rows = [];
  const lines = md.split(/\r?\n/);
  let inTable = false;
  let headerIdx = -1;
  // Skip the rollup "Total:" line if present (it sits outside the table).
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\|\s*Story\s*\|/.test(ln)) {
      inTable = true;
      headerIdx = i;
      continue;
    }
    if (inTable) {
      if (!/^\|/.test(ln)) break; // left the table
      if (/^\|[\s\-\|:]+\|$/.test(ln)) continue; // separator row
      // Row like: "| STORY-FOUND-001 | Title | Missing | — | — | Notes"
      const cells = ln.split('|').map((s) => s.trim()).filter((s, idx, arr) => idx !== 0 && idx !== arr.length - 1 || s.length);
      // Above filter is too lenient; redo cleanly.
      const raw = ln.replace(/^\|/, '').replace(/\|\s*$/, '');
      const parts = raw.split('|').map((s) => s.trim());
      const idMatch = parts[0] && parts[0].match(/^(STORY-(?:[A-Z]+(?:-[A-Z]+)*)-\d+)$/);
      if (!idMatch) continue; // epic header rows or other meta rows
      rows.push({
        story: idMatch[1],
        title: parts[1] || '',
        status: parts[2] || '',
        proof: parts[3] || '',
        notes: parts[5] || ''
      });
    }
  }
  return rows;
}

function indexPrototypeAnnotations(files) {
  // Map: story id -> Set<repo-relative file path>
  const map = new Map();
  for (const f of files) {
    const txt = readText(f);
    const found = txt.match(STORY_ID_RE);
    if (!found) continue;
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    for (const id of found) {
      if (!map.has(id)) map.set(id, new Set());
      map.get(id).add(rel);
    }
  }
  return map;
}

// ---------- rollup ----------

const yaml = readText(BACKLOG);
const md = readText(MATRIX);

const yamlStories = parseStoryIdsFromYaml(yaml);
const matrixRows = parseMatrixRows(md);
const protoFiles = walk(PROTOTYPE);
const annotations = indexPrototypeAnnotations(protoFiles);

// Use the matrix rows as the source of truth for what to show; but cross-check
// against the backlog story list so a missing story gets flagged.
const seen = new Map();
for (const r of matrixRows) seen.set(r.story, r);
for (const id of yamlStories) {
  if (!seen.has(id)) seen.set(id, { story: id, title: '(not in matrix)', status: 'Missing', proof: '—', notes: 'backlog story absent from coverage matrix' });
}

const rows = [...seen.values()].sort((a, b) => a.story.localeCompare(b.story));

// ---------- print ----------

console.log('\nCoverage rollup (curated from 09-coverage-matrix.md, cross-checked against prototype annotations)\n');
console.log('| Story | Status | Proof | Annotated (✓/✗) |');
console.log('|---|---|---|---|');
let counts = { Done: 0, Partial: 0, Missing: 0, Blocked: 0, "Won't Do": 0 };
for (const r of rows) {
  const ann = annotations.get(r.story);
  const mark = ann ? '✓' : '✗';
  const annNote = ann ? `${ann.size} file(s)` : '—';
  const proofShort = r.proof.length > 70 ? r.proof.slice(0, 67) + '…' : r.proof;
  console.log(`| ${r.story} | ${r.status} | ${proofShort} | ${mark} ${annNote} |`);
  if (counts[r.status] !== undefined) counts[r.status]++;
}
const total = rows.length;
function pct(n) { return total === 0 ? '0%' : Math.round((n / total) * 100) + '%'; }
console.log('\nAggregate (curated status):');
console.log(`Total: ${total} · Done: ${counts.Done} (${pct(counts.Done)}) · Partial: ${counts.Partial} (${pct(counts.Partial)}) · Missing: ${counts.Missing} (${pct(counts.Missing)}) · Blocked: ${counts.Blocked} (${pct(counts.Blocked)}) · Won't Do: ${counts["Won't Do"]} (${pct(counts["Won't Do"])})`);

// Cross-check: stories that appear ONLY in annotations but not in the matrix
const orphanAnnot = [...annotations.keys()].filter((id) => id.startsWith('STORY-') && !seen.has(id));
if (orphanAnnot.length) {
  console.log('\nAnnotated stories not present in the matrix (consider adding):');
  for (const id of orphanAnnot) console.log(`  - ${id}`);
}

// Reverse: matrix stories that have NO annotation yet (queued for next pass)
const unannotated = rows.filter((r) => r.status !== 'Missing' && r.status !== "Won't Do" && !annotations.has(r.story));
if (unannotated.length) {
  console.log('\nMatrix stories still needing an annotation tag:');
  for (const r of unannotated) console.log(`  - ${r.story} (${r.status})`);
}
console.log('');
