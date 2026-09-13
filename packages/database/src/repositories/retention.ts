// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `retention`/`hold` command catalogue (03-routes-and-contracts.md §4),
// not literal task text (same precedent as `ISS-091`).
import { NotImplemented } from './not-implemented.js';

export class PgRetentionRepository {
  currentPolicy(): Promise<unknown> {
    throw new NotImplemented('T-309');
  }

  setPolicy(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-309', { input });
  }

  previewBulk(fromDays: number, toDays: number): Promise<unknown> {
    throw new NotImplemented('T-309', { fromDays, toDays });
  }

  executeBulk(previewToken: string, reason: string): Promise<unknown> {
    throw new NotImplemented('T-309', { previewToken, reason });
  }

  placeHold(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-309', { input });
  }

  releaseHold(holdId: string, reason: string): Promise<unknown> {
    throw new NotImplemented('T-309', { holdId, reason });
  }

  expireOriginals(before: Date): Promise<unknown> {
    throw new NotImplemented('T-309', { before });
  }
}
