import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  commentSentinelPrefix,
  fileSentinelPrefix,
  RUN_EMAIL_DOMAIN,
  textSentinelPrefix,
} from '../fixtures/synthetic';
import { logsDir, runId } from '../helpers/env';
import { escapeRegExp } from '../helpers/content';

// BR2.8: after every journey (the log-scan project depends on all three), nothing the run typed
// reached a log, every log line is JSON, and every page `checkPage` saw carried a CSP header.

const LOG_FILES = ['web.log', 'worker.log'] as const;

// ASSUMPTION(U50): `next start` prints its own start banner as plain text before the app logger
// takes over; only these exact framework lines are exempt from the JSON rule (ISS-755). They are
// still scanned for sentinels.
const FRAMEWORK_BANNER = [
  /^\s*▲ Next\.js \d+\.\d+\.\d+/,
  /^\s*- (Local|Network|Environments|Experiments):/,
  /^\s*✓ (Starting\.\.\.|Ready in \d+(\.\d+)?m?s)$/,
];

const readLines = (file: string): string[] =>
  readFileSync(path.join(logsDir(), file), 'utf8').split(/\r?\n/);

function isJson(line: string): boolean {
  try {
    const value: unknown = JSON.parse(line);
    return typeof value === 'object' && value !== null;
  } catch {
    return false;
  }
}

/** The run's private markers: the three sentinels and any run account's address. */
function runMarkers(): RegExp {
  const id = runId();
  const prefixes = [textSentinelPrefix(id), fileSentinelPrefix(id), commentSentinelPrefix(id)];
  const email = `e2e${escapeRegExp(id)}[a-z0-9_]*@${escapeRegExp(RUN_EMAIL_DOMAIN)}`;
  return new RegExp([...prefixes.map(escapeRegExp), email].join('|'), 'i');
}

for (const file of LOG_FILES) {
  test(`OPS logs ${file} holds no sentinel or run email`, () => {
    expect(existsSync(path.join(logsDir(), file)), `${file} was written`).toBe(true);
    const markers = runMarkers();
    const leaks = readLines(file)
      .map((line, index) => ({ line: index + 1, match: markers.exec(line)?.[0] }))
      .filter((hit) => hit.match !== undefined);
    // Line numbers and the matched marker only: the leaking line itself stays out of the report.
    expect(leaks, `${file} lines carrying run data`).toEqual([]);
  });

  test(`OPS logs every line of ${file} is JSON`, () => {
    const lines = readLines(file).filter((line) => line.trim() !== '');
    expect(lines.length, `${file} has log lines`).toBeGreaterThan(0);
    const plain = lines
      .map((line, index) => ({ line: index + 1, text: line }))
      .filter(({ text }) => !isJson(text) && !FRAMEWORK_BANNER.some((rule) => rule.test(text)))
      .map(({ line, text }) => `line ${line} (${text.length} characters)`);
    expect(plain, `${file} lines that are not JSON`).toEqual([]);
  });
}

test('SEC CSP every page checkPage saw carried the header', () => {
  const file = path.join(logsDir(), 'csp.jsonl');
  expect(existsSync(file), 'checkPage recorded pages this run').toBe(true);
  const rows = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as { url: string; csp: string });
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.filter((row) => row.csp.trim() === '').map((row) => row.url),
    'pages without a content-security-policy header',
  ).toEqual([]);
  const locales = new Set(rows.map((row) => new URL(row.url).pathname.split('/')[1]));
  expect([...locales].sort(), 'pages seen in both languages').toEqual(
    expect.arrayContaining(['bn', 'en']),
  );
});
