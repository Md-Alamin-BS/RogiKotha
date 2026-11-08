import path from 'node:path';

import { repoRoot } from '../helpers/env';
import type { Locale } from '../helpers/locale';

// BR7.2: only the seeded facts DEMO.md publishes or the storyboard names, reached by visible
// name; public ids are read from URLs after navigation, never written here.

export const SHARED_PASSWORD = 'demo-pass-2026!';

export const SEEDED_USERNAMES = {
  shirin: 'shirin_88',
  rafi: 'rafi_c',
  anonAuthorR2: 'anon_author_r2',
  namedTanvir: 'named_tanvir-ahmed',
} as const;

/** The language the seed stores on every seeded account; sign-in lands in it (BR4.4). */
export const SEEDED_ACCOUNT_LOCALE: Locale = 'en';

type Named = Readonly<Record<Locale, string>>;

/** d1, the read-only profile doctor of P1.4 and r1's doctor. */
export const PROFILE_DOCTOR: Named = { en: 'Dr. Farhana Rahman', bn: 'ডা. ফারহানা রহমান' };

/**
 * ASSUMPTION(U50): d10, the sparse doctor P1.4b opens; the d7-d10 corpus rows fill every field,
 * so Step 30 confirms which fields its page shows as not provided (ISS-752).
 */
export const SPARSE_DOCTOR: Named = { en: 'Dr. Lutfun Nahar', bn: 'ডা. লুৎফুন নাহার' };

/**
 * WRITE_TARGET_DOCTOR: d6, one seeded review, named by no storyboard step, so no reading test
 * opens or counts it. Every writing test publishes about it or about a doctor it adds.
 */
export const WRITE_TARGET_DOCTOR: Named = { en: 'Dr. Rezaul Karim', bn: 'ডা. রেজাউল করিম' };

/**
 * The seed stores every review in Bengali only (`seed-content.ts`, `language: 'bn'`), and a
 * review is shown in the language it was written in, so both locales show the Bengali title
 * (ISS-762).
 */
const writtenInBengali = (bn: string): Named => ({ en: bn, bn });

/** r1's seeded title, used to open it; its public id comes from the URL. */
export const R1_TITLE: Named = writtenInBengali(
  'কেন আমার সুগার ওঠানামা করছিল, উনি আসলেই বুঝিয়ে বললেন',
);

/** BR7.3: read by path, never imported from packages/test-support (BR7.4). */
export const EVIDENCE_FIXTURES = [
  'prescription-1.jpg',
  'prescription-2.jpg',
  'photo.jpg',
  'broken.jpg',
  'flagged.jpg',
  'report.pdf',
] as const;

export type EvidenceFixture = (typeof EVIDENCE_FIXTURES)[number];

export const fixturePath = (name: EvidenceFixture, root = repoRoot()): string =>
  path.join(root, 'packages', 'test-support', 'fixtures', name);

/** The configured limited-data threshold of the seeded configuration version (corpus config). */
export const LIMITED_DATA_THRESHOLD = 5;

/** The emergency numbers and last-verified date of the seeded configuration, as the pages show them. */
export const EMERGENCY_NUMBERS = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
} as const;

export const EMERGENCY_VERIFIED: Named = { en: '21 August 2026', bn: '২১ আগস্ট ২০২৬' };

/** The ten seeded topics (conditions c1-c10), by visible name. */
export const SEEDED_TOPICS: Readonly<Record<Locale, readonly string[]>> = {
  en: [
    'Type 2 diabetes',
    'Thyroid (hypothyroidism)',
    'High blood pressure',
    'Eczema',
    'Frozen shoulder',
    'Irritable bowel syndrome',
    'Typhoid fever',
    'Gastric ulcer',
    'Asthma',
    'Migraine',
  ],
  bn: [
    'টাইপ ২ ডায়াবেটিস',
    'থাইরয়েড (হাইপোথাইরয়েড)',
    'উচ্চ রক্তচাপ',
    'একজিমা',
    'ফ্রোজেন শোল্ডার',
    'আইবিএস',
    'টাইফয়েড জ্বর',
    'গ্যাস্ট্রিক আলসার',
    'হাঁপানি',
    'মাইগ্রেন',
  ],
};

/**
 * ASSUMPTION(U50): r1 carries no stored claim (corpus `claims: []`), so P1.6 reads the
 * Reviewer's label on r6 (claim `wrongDiagnosis`, doctor d2). r4 has a claim too but is seeded
 * hidden pending review, so it is never listed (ISS-753, ISS-762).
 */
export const CLAIM_REVIEW_TITLE: Named = writtenInBengali(
  'প্রেসারের চিকিৎসা হলো, পরে দেখা গেল আরও কিছু আছে',
);

/** A username no account holds, for the author page's unknown-name case. */
export const UNKNOWN_USERNAME = 'no_such_author_e2e';
