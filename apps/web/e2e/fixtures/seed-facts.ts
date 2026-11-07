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

/** r1's seeded title, used to open it; its public id comes from the URL. */
export const R1_TITLE: Named = {
  en: 'She actually explained why my sugar was swinging',
  bn: 'কেন আমার সুগার ওঠানামা করছিল, উনি আসলেই বুঝিয়ে বললেন',
};

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
