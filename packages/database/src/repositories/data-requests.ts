// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `dataRequest` command catalogue (03-routes-and-contracts.md §4), not
// literal task text (same precedent as `ISS-091`).
import { NotImplemented } from './not-implemented.js';

export class PgDataRequestRepository {
  createExportRequest(accountId: string, idempotencyKey: string): Promise<unknown> {
    throw new NotImplemented('T-410', { accountId, idempotencyKey });
  }

  createDeletionRequest(accountId: string, idempotencyKey: string, plan: unknown): Promise<unknown> {
    throw new NotImplemented('T-410', { accountId, idempotencyKey, plan });
  }

  getStatus(requestId: string): Promise<unknown> {
    throw new NotImplemented('T-410', { requestId });
  }

  updatePlanStep(requestId: string, module: string, status: string, errorCode?: string): Promise<unknown> {
    throw new NotImplemented('T-410', { requestId, module, status, errorCode });
  }
}
