// `aCondition()` — a taxonomy condition term (02-data-model.md §5). No
// entity-level zod schema exists yet; see doctor.ts's header comment for why.
import type { CorpusCondition } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface ConditionBuild extends CorpusCondition {
  id: string;
}

export function aCondition(overrides: Partial<ConditionBuild> = {}): ConditionBuild {
  const n = seqId('condition');
  return {
    id: n,
    seedRef: n,
    name: { en: `Builder condition ${n}`, bn: `বিল্ডার রোগ ${n}` },
    aliases: [],
    ...overrides,
  };
}
