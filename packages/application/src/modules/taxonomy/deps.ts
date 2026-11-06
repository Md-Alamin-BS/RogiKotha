// What the Taxonomy module reads and writes through. Review figures arrive only through
// `ConditionStats` (BR6.1); this module never imports the Review module or its port.
import type { AuditWriter, IdGenerator, Outbox, TaxonomyRepository } from '../../ports';
import type { ConditionStats } from './ports';

export interface TaxonomyDeps {
  taxonomy: TaxonomyRepository;
  conditionStats: ConditionStats;
  audit: AuditWriter;
  outbox: Outbox;
  ids: IdGenerator;
}

/** `taxonomy.createProvisional`: 30 calls per account per hour, per process (BR5.4, C18). */
export const CREATE_PROVISIONAL_LIMIT = 30;
export const CREATE_PROVISIONAL_WINDOW_SEC = 3600;
