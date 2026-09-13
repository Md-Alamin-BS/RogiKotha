// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `moderation` command catalogue (03-routes-and-contracts.md §4), not
// literal task text (same precedent as `ISS-091`).
import { NotImplemented } from './not-implemented.js';

export class PgModerationRepository {
  fileReport(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-403', { input });
  }

  queue(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-403', { input });
  }

  getCase(code: string): Promise<unknown> {
    throw new NotImplemented('T-403', { code });
  }

  decide(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-404', { input });
  }

  restore(caseCode: string, reasonCode: string): Promise<unknown> {
    throw new NotImplemented('T-404', { caseCode, reasonCode });
  }

  fileAppeal(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-404', { input });
  }

  decideAppeal(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-404', { input });
  }

  myAppealable(accountId: string): Promise<unknown> {
    throw new NotImplemented('T-404', { accountId });
  }

  bulkPreview(caseCodes: string[], action: string): Promise<unknown> {
    throw new NotImplemented('T-404', { caseCodes, action });
  }

  bulkApply(previewToken: string, reasonCode: string): Promise<unknown> {
    throw new NotImplemented('T-404', { previewToken, reasonCode });
  }
}
