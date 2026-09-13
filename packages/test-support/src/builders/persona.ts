// `aPersona()` — a persona entity (02-data-model.md §3, AD-3). No
// entity-level zod schema exists yet; see doctor.ts's header comment.
import type { CorpusPersona } from '../corpus/types.js';
import { seqId } from './seq.js';

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
