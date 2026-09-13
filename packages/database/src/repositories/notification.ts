// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `notification` command catalogue (03-routes-and-contracts.md §4), not
// literal task text (same precedent as `ISS-091`).
import { NotImplemented } from './not-implemented.js';

export class PgNotificationRepository {
  list(accountId: string, cursor?: string): Promise<unknown> {
    throw new NotImplemented('T-405', { accountId, cursor });
  }

  markRead(accountId: string, ids: string[] | 'all'): Promise<unknown> {
    throw new NotImplemented('T-405', { accountId, ids });
  }

  unreadCount(accountId: string): Promise<unknown> {
    throw new NotImplemented('T-405', { accountId });
  }

  insert(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-405', { input });
  }

  listStaffNotifications(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-408', { input });
  }

  ackStaffNotification(id: string): Promise<unknown> {
    throw new NotImplemented('T-408', { id });
  }

  insertEmailDelivery(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-405', { input });
  }

  updateEmailDeliveryStatus(id: string, status: string, lastErrorCode?: string): Promise<unknown> {
    throw new NotImplemented('T-405', { id, status, lastErrorCode });
  }
}
