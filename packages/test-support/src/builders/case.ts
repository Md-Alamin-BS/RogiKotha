// `aCase()` — a moderation case entity. No entity-level zod schema exists
// yet; see doctor.ts's header comment. `moderation.decide`'s input
// (`DecideCaseInput`) needs a real `MOD-\d+` code, which `toDecideCaseInput()`
// below derives so builders.test.ts can validate that subset against the
// real contracts schema.
import type { DecideCaseInput, ModerationAction, ModerationLane, ReportReason } from '@rogikotha/contracts';
import type { z } from 'zod';

import type { CorpusModerationCase } from '../corpus/types.js';
import { seq } from './seq.js';

export interface CaseBuild extends CorpusModerationCase {
  id: string;
  code: string;
}

export function aCase(overrides: Partial<CaseBuild> = {}): CaseBuild {
  const n = seq('case');
  const code = `MOD-${9000 + n}`;
  const lane: ModerationLane = overrides.lane ?? 'standard';
  const reasons: ReportReason[] = overrides.reportReasons ?? ['factual'];
  return {
    id: code,
    code,
    seedRef: code,
    lane,
    ageHours: 1,
    // CR-008: defaults to the reason-list length, same as every case in
    // the corpus except MOD-2033 (ISS-174) — a builder default, not a
    // claim about that fixture.
    reportCount: reasons.length,
    reportReasons: reasons,
    autoHidden: false,
    coordinated: false,
    targetKind: 'comment',
    targetSeedRef: `builder-target-${n}`,
    reviewSeedRef: null,
    summary: { en: `Builder case ${code}`, bn: `বিল্ডার কেস ${code}` },
    note: { en: 'Synthetic case for tests.', bn: 'পরীক্ষার জন্য কাল্পনিক কেস।' },
    ...overrides,
  };
}

export function toDecideCaseInput(
  c: CaseBuild,
  action: ModerationAction = 'warn',
): z.infer<typeof DecideCaseInput> {
  return {
    caseCode: c.code,
    action,
    reasonCode: 'builder-reason',
    reasonToAuthor: 'A moderator reviewed this.',
    policyVersion: '1',
  };
}
