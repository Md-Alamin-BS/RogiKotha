// Test helpers for the home and doctor views: real message files and view-row builders.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import type {
  DemoDoctorDetail,
  DemoDoctorListRow,
  DemoReviewCard,
  ConditionPageVM,
  DistributionVM,
  DoctorCardVM,
  DoctorProfileVM,
  ExperienceCardVM,
  FacilityCardVM,
  FacilityProfileVM,
  ProvenanceVM,
} from '@rogikotha/contracts';
import { CRITERIA, CRITERION_VALUES, OUTCOMES, SENTIMENTS, toIso } from '@rogikotha/contracts';

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
    memberAdded: false,
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

// U46 view-model builders. Public ids follow PUBLIC_ID_RE: ten characters, no i, l, o or u.
const vmId = (prefix: 'd' | 'f' | 'c' | 'e' | 'v') =>
  `${prefix}${String(nextSeq()).padStart(9, '0')}`;

const PROVENANCE: ProvenanceVM = {
  source: 'community',
  updatedAt: toIso(new Date('2026-05-04T06:00:00.000Z')),
};

/** A distribution over `keys` from `counts`; zero keys are filled, the rest is derived. */
export function aDistribution(
  keys: readonly string[],
  counts: Record<string, number> = {},
  overrides: Partial<DistributionVM> = {},
): DistributionVM {
  const full = Object.fromEntries(keys.map((k) => [k, counts[k] ?? 0]));
  const total = Object.values(full).reduce((sum, n) => sum + n, 0);
  return {
    keys: [...keys],
    counts: full,
    total,
    notProvided: 0,
    empty: total === 0,
    limitedData: false,
    ...overrides,
  };
}

export const aSentiment = (counts: Record<string, number> = {}, o: Partial<DistributionVM> = {}) =>
  aDistribution(SENTIMENTS, counts, o);
export const anOutcome = (counts: Record<string, number> = {}, o: Partial<DistributionVM> = {}) =>
  aDistribution(OUTCOMES, counts, o);

export function anExperienceCard(overrides: Partial<ExperienceCardVM> = {}): ExperienceCardVM {
  return {
    publicId: vmId('e'),
    title: 'A careful second visit',
    excerpt: 'Waited two hours, then a careful exam and a clear plan.',
    truncated: false,
    sentiment: 'positive',
    outcome: 'helped',
    condition: { publicId: 'c000000001', name: 'Type 2 diabetes' },
    documentsCount: 0,
    author: { personaKind: 'named', displayName: 'Rina Akter', initials: 'RA' },
    relationship: 'self',
    period: { year: 2026, month: 3 },
    doctor: { publicId: 'd000000001', name: 'Dr. Synthetic Rahman' },
    ...overrides,
  };
}

export function aDoctorCard(overrides: Partial<DoctorCardVM> = {}): DoctorCardVM {
  return {
    publicId: vmId('d'),
    name: 'Dr. Synthetic Rahman',
    specialty: 'Endocrinology',
    area: 'Dhanmondi',
    city: 'Dhaka',
    avatarHue: 210,
    topConditions: [{ publicId: 'c000000001', name: 'Type 2 diabetes', count: 3 }],
    documentsCount: 1,
    accountsTotal: 6,
    accountsLimitedData: false,
    sentiment: aSentiment({ positive: 4, mixed: 1, negative: 1 }),
    claimed: false,
    registrationNotVerified: true,
    memberAddedNotConfirmed: false,
    ...overrides,
  };
}

export function aDoctorProfile(overrides: Partial<DoctorProfileVM> = {}): DoctorProfileVM {
  const card = aDoctorCard();
  const condition = { publicId: 'c000000001', name: 'Type 2 diabetes' };
  return {
    ...card,
    about: 'Sees adults with thyroid and diabetes care.',
    facts: [
      { key: 'specialty', value: 'Endocrinology', provenance: PROVENANCE },
      { key: 'fee', value: '৳1,200', provenance: PROVENANCE },
    ],
    chambers: [
      { name: 'Synthetic General Hospital', hours: 'Sat–Wed, 6–9 pm', provenance: PROVENANCE },
    ],
    conditions: [{ ...condition, count: 6 }],
    breakdown: [{ condition, sentiment: card.sentiment }],
    facilities: [
      {
        publicId: 'f000000001',
        name: 'Synthetic General Hospital',
        branchName: 'Dhanmondi branch',
        type: 'hospital',
        avatarHue: 30,
      },
    ],
    accounts: [anExperienceCard()],
    scopedSentiment: card.sentiment,
    scopedOutcome: anOutcome({ helped: 4, none: 1, worse: 0, uncertain: 1 }),
    scopedTotal: 6,
    showing: 6,
    ...overrides,
  };
}

export function aFacilityCard(overrides: Partial<FacilityCardVM> = {}): FacilityCardVM {
  return {
    publicId: vmId('f'),
    name: 'Synthetic General Hospital',
    branchName: 'Dhanmondi branch',
    parentName: 'Synthetic Health Group',
    type: 'hospital',
    area: 'Dhanmondi',
    city: 'Dhaka',
    avatarHue: 30,
    feedbackVisible: true,
    accountsTotal: 2,
    accountsLimitedData: true,
    overall: aDistribution(CRITERION_VALUES, { good: 1, mixed: 1 }, { limitedData: true }),
    claimed: false,
    notVerified: true,
    ...overrides,
  };
}

export function aFacilityProfile(overrides: Partial<FacilityProfileVM> = {}): FacilityProfileVM {
  return {
    ...aFacilityCard(),
    address: 'Road 5, Dhanmondi, Dhaka',
    provenance: { name: PROVENANCE, address: PROVENANCE },
    criteria: CRITERIA.map((key) => ({
      key,
      dist:
        key === 'staff'
          ? aDistribution(CRITERION_VALUES, { good: 2 }, { limitedData: true })
          : aDistribution(CRITERION_VALUES),
    })),
    accounts: [
      {
        publicId: vmId('v'),
        author: { personaKind: 'anonymous' },
        period: { year: 2026, month: 2 },
        posted: '2026-03-01',
        body: 'The reception was calm and the queue moved quickly.',
        overall: 'mixed',
        criteria: [
          { key: 'staff', value: 'good' },
          { key: 'overall', value: 'mixed' },
        ],
      },
    ],
    doctorsHere: [{ publicId: 'd000000002', name: 'Dr. Synthetic Haque', avatarHue: 120 }],
    siblings: [
      {
        publicId: 'f000000002',
        name: 'Synthetic General Hospital',
        branchName: 'Mirpur branch',
        area: 'Mirpur',
        avatarHue: 40,
      },
    ],
    ...overrides,
  };
}

export function aConditionPage(overrides: Partial<ConditionPageVM> = {}): ConditionPageVM {
  return {
    publicId: vmId('c'),
    name: 'Type 2 diabetes',
    provisional: false,
    aliases: ['sugar', 'ডায়াবেটিস'],
    accountsTotal: 4,
    accountsLimitedData: true,
    doctorsTotal: 2,
    specialties: [{ name: 'Endocrinology', count: 3 }],
    places: [
      { hospital: 'Synthetic General Hospital', area: 'Dhanmondi', city: 'Dhaka', count: 1 },
      { area: 'Mirpur', city: 'Dhaka', count: 3 },
    ],
    sentiment: aSentiment({ positive: 2, mixed: 1, negative: 1 }, { limitedData: true }),
    outcome: anOutcome({ helped: 3, uncertain: 1 }, { limitedData: true }),
    medicines: [
      { label: 'Metformin', count: 2 },
      { label: 'Insulin', count: 4 },
    ],
    treatments: [],
    symptoms: [{ label: 'Thirst', count: 1 }],
    accounts: [anExperienceCard()],
    doctors: [
      {
        publicId: 'd000000001',
        name: 'Dr. Synthetic Rahman',
        specialty: 'Endocrinology',
        count: 3,
        avatarHue: 210,
      },
    ],
    facilities: [
      {
        publicId: 'f000000001',
        name: 'Synthetic General Hospital',
        type: 'hospital',
        avatarHue: 30,
      },
    ],
    ...overrides,
  };
}

export const EMERGENCY_CONFIG = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '01779554391',
  lastVerified: '2026-10-01',
};
