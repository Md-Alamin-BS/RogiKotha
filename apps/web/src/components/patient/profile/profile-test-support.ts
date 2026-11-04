// Test-only helpers for the profile views (FR2).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { AbstractIntlMessages } from 'next-intl';
import type { DemoCurrentAccount, DemoOwnReviewRow, DemoProfile } from '@rogikotha/contracts';

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');

/** The real message file for `locale`. */
export function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

let sequence = 0;

export function buildCurrentAccount(
  overrides: Partial<DemoCurrentAccount> = {},
): DemoCurrentAccount {
  sequence += 1;
  return {
    accountId: `account-${sequence}`,
    authUserId: `auth-${sequence}`,
    username: 'rina_demo',
    displayName: 'Rina Akter',
    locale: 'en',
    status: 'active',
    currentPersonaId: `persona-${sequence}`,
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<DemoProfile> = {}): DemoProfile {
  return {
    accountId: 'account-profile',
    username: 'rina_demo',
    displayName: 'Rina Akter',
    locale: 'en',
    createdAt: new Date('2026-03-14T06:00:00Z'),
    ...overrides,
  };
}

export function buildOwnReview(overrides: Partial<DemoOwnReviewRow> = {}): DemoOwnReviewRow {
  sequence += 1;
  return {
    publicId: `pub${String(sequence).padStart(7, '0')}`,
    title: `Synthetic visit ${sequence}`,
    doctorName: 'Dr. Synthetic Example',
    state: 'published',
    publishedAt: new Date('2026-04-10T06:00:00Z'),
    edited: false,
    ...overrides,
  };
}
