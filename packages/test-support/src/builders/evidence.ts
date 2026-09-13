// `anEvidenceItem()` — an evidence item entity. `toIntakeEvidenceInput()`
// extracts the `evidence.intake` command-input subset for schema validation
// against the real `IntakeEvidenceInput` (contracts/schemas/evidence.ts).
import type { IntakeEvidenceInput } from '@rogikotha/contracts';
import type { z } from 'zod';

import type { CorpusEvidenceItem } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface EvidenceItemBuild extends CorpusEvidenceItem {
  id: string;
  declaredMime: 'image/jpeg' | 'image/png';
  bytes: number;
}

export function anEvidenceItem(overrides: Partial<EvidenceItemBuild> = {}): EvidenceItemBuild {
  const n = seqId('evidence');
  return {
    id: n,
    seedRef: n,
    reviewSeedRef: overrides.reviewSeedRef ?? 'r1',
    group: 'reviewed',
    label: { en: `Builder document ${n}`, bn: `বিল্ডার নথি ${n}` },
    prototypeState: 'ready',
    pageCount: 1,
    declaredMime: 'image/jpeg',
    bytes: 12_345,
    ...overrides,
  };
}

export function toIntakeEvidenceInput(e: EvidenceItemBuild): z.infer<typeof IntakeEvidenceInput> {
  return {
    reviewDraftId: e.reviewSeedRef,
    group: e.group,
    declaredMime: e.declaredMime,
    declaredName: `${e.seedRef}.jpg`,
    bytes: e.bytes,
    idempotencyKey: `idem-${e.seedRef}`,
  };
}
