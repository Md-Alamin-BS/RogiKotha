// What the Directory module reads and writes through. Review figures arrive only through
// `ProviderExperience` (BR6.1); this module never imports the Review module or its port.
import type { AuditWriter, Clock, DirectoryRepository, IdGenerator, Outbox } from '../../ports';
import type { ProviderExperience } from './ports';

export interface DirectoryDeps {
  directory: DirectoryRepository;
  providerExperience: ProviderExperience;
  audit: AuditWriter;
  outbox: Outbox;
  ids: IdGenerator;
  clock: Clock;
}

/** Release 1 lists one page of up to 100 with no paging links (Question 10). */
export const DEFAULT_PAGE_SIZE = 100;
