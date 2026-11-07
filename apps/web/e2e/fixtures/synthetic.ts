import type { TestInfo } from '@playwright/test';

import type { Locale } from '../helpers/locale';

// BR7.1: everything the suite types is synthetic and carries the run id, so the log scan
// (BR2.8) can prove none of it reached a log. No real person, doctor or facility name.

export const RUN_PASSWORD = 'e2e-run-pass-2026!';
export const CHANGED_PASSWORD = 'e2e-run-pass-2026-changed!';
export const RUN_EMAIL_DOMAIN = 'demo.rogikotha.local';

export const DISPLAY_NAMES: Readonly<Record<Locale, readonly string[]>> = {
  en: ['E2E Reader Mitu', 'E2E Reader Babul', 'E2E Reader Shapla', 'E2E Reader Kajol'],
  bn: ['ই২ই পাঠক মিতু', 'ই২ই পাঠক বাবুল', 'ই২ই পাঠক শাপলা', 'ই২ই পাঠক কাজল'],
};

const PROJECT_INITIALS: Readonly<Record<string, string>> = {
  'chromium-360': 'p',
  'chromium-desktop': 'd',
  'chromium-reduced-motion': 'r',
};

let accountsThisWorker = 0;

/** `e2e<runId><project initial><n>`: unique across workers and retries, within `[a-z0-9_]{3,24}`. */
export function runUsername(runId: string, testInfo: TestInfo): string {
  accountsThisWorker += 1;
  const initial = PROJECT_INITIALS[testInfo.project.name] ?? 'x';
  const n = `${testInfo.workerIndex.toString(36)}${testInfo.retry}${accountsThisWorker.toString(36)}`;
  const username = `e2e${runId}${initial}${n}`;
  if (username.length > 24)
    throw new Error(`Run username ${username} is longer than 24 characters`);
  return username;
}

export const runEmail = (username: string): string => `${username}@${RUN_EMAIL_DOMAIN}`;

export function displayName(locale: Locale, index = 0): string {
  const names = DISPLAY_NAMES[locale];
  return names[index % names.length] ?? names[0] ?? 'E2E Reader';
}

/** Playwright's test id without its dashes, so the sentinel stays one word. */
const compactTestId = (testInfo: TestInfo): string => testInfo.testId.replace(/[^a-z0-9]/gi, '');

export const textSentinelPrefix = (runId: string): string => `E2E-TEXT-${runId}`;
export const fileSentinelPrefix = (runId: string): string => `E2E-FILE-${runId}`;
export const commentSentinelPrefix = (runId: string): string => `E2E-COMMENT-${runId}`;

export const textSentinel = (runId: string, testInfo: TestInfo): string =>
  `${textSentinelPrefix(runId)}-${compactTestId(testInfo)}`;
export const commentSentinel = (runId: string, testInfo: TestInfo, role: string): string =>
  `${commentSentinelPrefix(runId)}-${compactTestId(testInfo)} ${role}`;

/** A doctor a test adds itself (P3.11b). */
export const addedDoctorName = (runId: string, n: number): string => `E2E Doctor ${runId}-${n}`;

/** Review text in Bengali, English and Banglish, with the text sentinel. */
export function reviewText(sentinel: string): string {
  return [
    'The doctor listened carefully and explained each test before ordering it.',
    'ডাক্তার মনোযোগ দিয়ে শুনলেন এবং প্রতিটি পরীক্ষা কেন দরকার বুঝিয়ে বললেন।',
    'Doctor shaheb khub dhorjo dhore sob bujhiye dilen, follow-up o thik moto holo.',
    sentinel,
  ].join(' ');
}

export function reviewTitle(locale: Locale, sentinel: string): string {
  return locale === 'bn'
    ? `ধৈর্য ধরে বুঝিয়ে বললেন ${sentinel}`
    : `Explained every step patiently ${sentinel}`;
}

function repeatTo(unit: string, length: number): string {
  let text = '';
  while (text.length < length) text += unit;
  const cut = text.slice(0, length);
  // Exactly `length` characters, never ending in a space a form would trim.
  return cut.endsWith(' ') ? `${cut.slice(0, -1)}।` : cut;
}

/** BR7.1, BR3.6: the longest strings the bn run writes, a 120-character title. */
export const LONG_BENGALI_TITLE = repeatTo(
  'দীর্ঘ অপেক্ষার পর চিকিৎসক সব প্রশ্নের উত্তর দিলেন ',
  120,
);

/** BR7.1, BR3.6: a 1500-character Bengali section. */
export const LONG_BENGALI_SECTION = repeatTo(
  'প্রথম দিন থেকে চিকিৎসক প্রতিটি পরীক্ষার কারণ বুঝিয়ে বললেন, ওষুধের সময় ঠিক করে দিলেন এবং ছয় সপ্তাহ পরে আবার দেখা করতে বললেন। ',
  1500,
);

/** BR7.3: a valid PNG signature followed by zeros to 16 MiB, built in memory. */
export function oversizePng(): Buffer {
  const buffer = Buffer.alloc(16 * 1024 * 1024);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  return buffer;
}
