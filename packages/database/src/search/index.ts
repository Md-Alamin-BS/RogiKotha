// Stub adapter file only (task step 13) — the search SQL itself (FTS +
// trigram ranking, publication filter, Bangla/Banglish alias resolution) is
// T-205's task, not this one ("Not in scope" — task file).
import { NotImplemented } from '../repositories/not-implemented.js';

export class PgSearchIndex {
  upsert(doc: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-205', { doc });
  }

  remove(kind: string, refId: string): Promise<unknown> {
    throw new NotImplemented('T-205', { kind, refId });
  }

  search(query: string, filters: Record<string, unknown>, page: number): Promise<unknown> {
    throw new NotImplemented('T-205', { query, filters, page });
  }

  suggest(q: string): Promise<unknown> {
    throw new NotImplemented('T-205', { q });
  }
}
