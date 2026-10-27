// Stubs only (task step 15). Method names from the taxonomy command
// catalogue (03-routes-and-contracts.md §4, module `taxonomy`, T-201).
import { NotImplemented } from './not-implemented';

export class PgTaxonomyRepository {
  getCondition(publicId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { publicId });
  }

  listConditions(filters: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-201', { filters });
  }

  resolve(text: string): Promise<unknown> {
    throw new NotImplemented('T-201', { text });
  }

  listSuggested(group: string): Promise<unknown> {
    throw new NotImplemented('T-201', { group });
  }

  createProvisional(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-201', { input });
  }

  mapProvisional(termId: string, canonicalId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { termId, canonicalId });
  }
}
