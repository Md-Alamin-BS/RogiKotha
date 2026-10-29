// `pnpm check:identity`: refuses tool attribution in commits and tracked files (T-010, ISS-060).
// It looks for attribution markers only; a bare tool or model name is not one (BR11.2).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Trees whose records may quote or name tools on purpose, such as the AI-DLC audit cost entries
// AGENTS.md allows (BR11.1).
export const EXCLUDED_PREFIXES = [
  'docs/',
  'aidlc/',
  '.claude/',
  '.codex/',
  '.agents/',
  '.github/agents/',
  '_bmad/',
  'ui-design-prototype/',
];

const TOOL_ADDRESSES = [
  'noreply@anthropic.com',
  'noreply@puku.sh',
  'noreply@openai.com',
  'cursoragent@cursor.com',
  '+copilot@users.noreply.github.com',
];

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Each pattern is anchored to the shape of a real trailer or footer, so prose that mentions one
// (AGENTS.md does) passes.
const MARKERS = [
  {
    name: 'co-author trailer',
    pattern: /^[ \t]*co-authored-by:[ \t]*\S[^\n]*<[^<>\s]+@[^<>\s]+>/im,
  },
  {
    name: 'generated-with footer',
    pattern: /^[ \t]*(?:\u{1F916}[ \t]*)?generated (?:with|by) \[[^\]\n]+\]\([^)\n]+\)/imu,
  },
  { name: 'robot-emoji footer', pattern: /^[ \t]*\u{1F916}/mu },
  {
    name: 'tool no-reply address',
    pattern: new RegExp(`<[^<>\\s]*(?:${TOOL_ADDRESSES.map(escape).join('|')})>`, 'i'),
  },
];

/** The markers found in one text, with the 1-based line of each. */
export function findMarkers(text) {
  const hits = [];
  for (const { name, pattern } of MARKERS) {
    const match = pattern.exec(text);
    if (match) {
      hits.push({ marker: name, line: text.slice(0, match.index).split('\n').length });
    }
  }
  return hits;
}

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });

/**
 * The commits to read: `--range` if given, else `CHECK_IDENTITY_RANGE` (CI sets the push range),
 * else since main's merge base, else HEAD alone.
 */
export function commitRange(cwd, explicitRange, env = process.env) {
  if (explicitRange) return explicitRange;
  if (env.CHECK_IDENTITY_RANGE) return env.CHECK_IDENTITY_RANGE;
  const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  if (branch !== 'main') {
    try {
      const base = git(cwd, ['merge-base', 'main', 'HEAD']).trim();
      return `${base}..HEAD`;
    } catch {
      // No local `main` (a shallow CI checkout): fall through to HEAD alone.
    }
  }
  return 'HEAD^!';
}

export function checkCommits(cwd, range) {
  const hits = [];
  // ASSUMPTION(T-010): author and committer lines are read too; the ISS-057 leak was an author field.
  const log = git(cwd, ['log', '--format=%H%x00%an <%ae>%n%cn <%ce>%n%B%x00%x00', range]);
  for (const entry of log.split('\0\0').filter((part) => part.trim())) {
    const [hash, body = ''] = entry.trim().split('\0');
    for (const hit of findMarkers(body)) {
      hits.push({ place: `commit ${hash.slice(0, 12)}`, ...hit });
    }
  }
  return hits;
}

const isBinary = (buffer) => buffer.subarray(0, 8000).includes(0);

export function checkTrackedFiles(cwd) {
  const files = git(cwd, ['ls-files', '-z'])
    .split('\0')
    .filter((file) => file && !EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));
  const hits = [];
  for (const file of files) {
    let buffer;
    try {
      buffer = readFileSync(path.join(cwd, file));
    } catch (error) {
      // A tracked file deleted in the working tree has nothing to read.
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (isBinary(buffer)) continue;
    for (const hit of findMarkers(buffer.toString('utf8'))) {
      hits.push({ place: file, ...hit });
    }
  }
  return hits;
}

export function checkIdentity({ cwd = process.cwd(), range, env = process.env } = {}) {
  const resolvedRange = commitRange(cwd, range, env);
  return {
    range: resolvedRange,
    hits: [...checkCommits(cwd, resolvedRange), ...checkTrackedFiles(cwd)],
  };
}

function main() {
  const flag = process.argv.indexOf('--range');
  const range = flag === -1 ? undefined : process.argv[flag + 1];
  const { range: checked, hits } = checkIdentity({ range });
  if (hits.length === 0) {
    process.stdout.write(`No attribution markers (commits ${checked}, tracked files).\n`);
    return;
  }
  for (const hit of hits) {
    console.error(`${hit.place}:${hit.line} ${hit.marker}`);
  }
  console.error(`${hits.length} attribution marker(s) found; see AGENTS.md "No agent identity".`);
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
