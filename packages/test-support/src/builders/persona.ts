// `aPersona()` — a persona entity (02-data-model.md §3, AD-3). No
// entity-level zod schema exists yet; see doctor.ts's header comment.
import type { PersonaRecord } from '@rogikotha/application';

import type { CorpusPersona } from '../corpus/types.js';
import { seq, seqId } from './seq.js';

export interface PersonaBuild extends CorpusPersona {
  id: string;
}

export function aPersona(overrides: Partial<PersonaBuild> = {}): PersonaBuild {
  const n = seqId('persona');
  return {
    id: n,
    key: n,
    kind: 'pseudonymous',
    displayName: { en: `persona_${n}`, bn: `persona_${n}` },
    username: `persona_${n}`,
    avatarHue: 200,
    accountUsername: `persona_${n}`,
    ...overrides,
  };
}

/** A `personas` row as the U11 identity repositories return it; named unless overridden. */
export function aPersonaRecord(overrides: Partial<PersonaRecord> = {}): PersonaRecord {
  const n = seq('persona-record');
  const anonymous = overrides.kind === 'anonymous';
  return {
    id: `00000000-0000-7000-a000-${n.toString(16).padStart(12, '0')}`,
    kind: 'named',
    displayName: anonymous ? 'patient-ab23' : `Member ${n}`,
    username: anonymous ? null : `member_${n}`,
    avatarHue: anonymous ? 0 : null,
    ...overrides,
  };
}
