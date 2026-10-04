// `aDoctor()` — a fully-shaped doctor record for domain/application tests
// (01-conventions.md §10: "builders, never hand-written fixture objects").
// No entity-level zod schema exists for `doctors` yet (packages/domain is
// still the T-003 placeholder), so this mirrors `CorpusDoctor` plus a
// deterministic id — the closest "fully valid object for the corresponding
// … entity" this codebase can check right now (see ISSUES.md).
import type { Provenance } from '@rogikotha/contracts';

import type { CorpusChamber, CorpusDoctor } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface DoctorBuild extends CorpusDoctor {
  id: string;
}

const DEFAULT_PROVENANCE: Provenance = 'community';

export function aDoctor(overrides: Partial<DoctorBuild> = {}): DoctorBuild {
  const n = seqId('doctor');
  const chambers: CorpusChamber[] = overrides.chambers ?? [
    {
      name: { en: `${n} Clinic`, bn: `${n} ক্লিনিক` },
      hours: { en: 'Daily, 6-9 pm', bn: 'প্রতিদিন, সন্ধ্যা ৬-৯টা' },
      provenance: DEFAULT_PROVENANCE,
    },
  ];
  return {
    id: n,
    seedRef: n,
    name: { en: `Dr. Builder ${n}`, bn: `ডা. বিল্ডার ${n}` },
    specialty: { en: 'General Medicine', bn: 'জেনারেল মেডিসিন' },
    qualifications: { en: 'MBBS', bn: 'এমবিবিএস' },
    bmdc: `A-${n}`,
    gender: 'female',
    languages: { en: 'Bangla, English', bn: 'বাংলা, ইংরেজি' },
    fee: { en: '৳500', bn: '৫০০ টাকা' },
    city: { en: 'Dhaka', bn: 'ঢাকা' },
    area: { en: 'Mirpur', bn: 'মিরপুর' },
    chambers,
    fieldProvenance: { name: DEFAULT_PROVENANCE, specialty: DEFAULT_PROVENANCE },
    claimed: false,
    avatarHue: 200,
    ...overrides,
  };
}
