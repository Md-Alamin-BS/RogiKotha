// Test helpers for the home and doctor views: real message files and view-row builders.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import type { DemoDoctorDetail, DemoDoctorListRow, DemoReviewCard } from '@rogikotha/contracts';

export type TestLocale = 'en' | 'bn';

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');

const cache = new Map<TestLocale, AbstractIntlMessages>();

/** The real dictionary for `locale`. */
export function loadMessages(locale: TestLocale): AbstractIntlMessages {
  const cached = cache.get(locale);
  if (cached) return cached;
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
  cache.set(locale, messages);
  return messages;
}

export function renderInLocale(locale: TestLocale, element: ReactElement) {
  return render(
    createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      children: element,
    }),
  );
}

let sequence = 0;
const nextSeq = () => (sequence += 1);

export function buildDoctorRow(overrides: Partial<DemoDoctorListRow> = {}): DemoDoctorListRow {
  const n = nextSeq();
  return {
    id: `0190a0b0-0000-7000-8000-${String(n).padStart(12, '0')}`,
    publicId: `doc${String(n).padStart(7, '0')}`,
    name: `Dr. Synthetic ${n}`,
    specialty: 'Endocrinology',
    qualifications: 'MBBS, FCPS',
    city: 'Dhaka',
    area: 'Dhanmondi',
    avatarHue: 210,
    publishedReviewCount: 3,
    ...overrides,
  };
}

export function buildDoctorDetail(overrides: Partial<DemoDoctorDetail> = {}): DemoDoctorDetail {
  return {
    ...buildDoctorRow(),
    about: 'Sees adults with thyroid and diabetes care.',
    languages: 'Bangla, English',
    feeDisplay: '৳1,200',
    chambers: [{ name: 'Synthetic General Hospital', hours: 'Sat–Wed, 6–9 pm' }],
    ...overrides,
  };
}

export function buildReviewCard(overrides: Partial<DemoReviewCard> = {}): DemoReviewCard {
  const n = nextSeq();
  return {
    publicId: `rev${String(n).padStart(7, '0')}`,
    title: `A careful second visit ${n}`,
    excerpt: 'Waited two hours, then a careful exam and a clear plan.',
    doctor: {
      id: `0190a0b0-0000-7000-9000-${String(n).padStart(12, '0')}`,
      publicId: `doc${String(n).padStart(7, '0')}`,
      name: `Dr. Synthetic ${n}`,
      specialty: 'Endocrinology',
    },
    authorDisplayName: 'Rina Akter',
    identityMode: 'named',
    relationship: 'self',
    sentiment: 'positive',
    outcome: 'helped',
    periodYear: 2026,
    periodMonth: 3,
    publishedAt: new Date('2026-06-01T06:00:00Z'),
    edited: false,
    commentCount: 2,
    readyEvidenceCount: 0,
    ...overrides,
  };
}

/** Characters and words that would make a number or symbol read as a quality score. */
export const QUALITY_SCORE_PATTERN = /★|☆|\/\s*5\b|\/\s*10\b|\brating\b|\bscore\b|\bstars?\b/i;
