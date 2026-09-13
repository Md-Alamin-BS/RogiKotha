// `aBranch()` — a facility branch record (02-data-model.md §4). No
// entity-level zod schema exists yet; see doctor.ts's header comment for why.
import type { CorpusBranch } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface BranchBuild extends CorpusBranch {
  id: string;
}

export function aBranch(overrides: Partial<BranchBuild> = {}): BranchBuild {
  const n = seqId('branch');
  return {
    id: n,
    seedRef: n,
    orgSeedRef: overrides.orgSeedRef ?? n,
    name: { en: `Builder Hospital ${n}`, bn: `বিল্ডার হাসপাতাল ${n}` },
    branchLabel: null,
    type: 'clinic',
    city: { en: 'Dhaka', bn: 'ঢাকা' },
    area: { en: 'Mirpur', bn: 'মিরপুর' },
    fieldProvenance: { name: 'community' },
    avatarHue: 120,
    doctorSeedRefs: [],
    ...overrides,
  };
}
