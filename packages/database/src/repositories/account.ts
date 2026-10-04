// Stubs only (task step 15) — every method throws `NotImplemented`, naming
// the task that fills it in. No `implements <Port>` clause yet:
// `application`'s port interfaces do not exist until T-101 wires this class
// in. Method names come from the account/staff command catalogue
// (03-routes-and-contracts.md §4).
import { NotImplemented } from './not-implemented.js';

export class PgAccountRepository {
  findByAuthUserId(authUserId: string): Promise<unknown> {
    throw new NotImplemented('T-101', { authUserId });
  }

  findByUsername(username: string): Promise<unknown> {
    throw new NotImplemented('T-101', { username });
  }

  createProfile(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-101', { input });
  }

  updateStatus(accountId: string, status: string): Promise<unknown> {
    throw new NotImplemented('T-101', { accountId, status });
  }

  listDevices(accountId: string): Promise<unknown> {
    throw new NotImplemented('T-103', { accountId });
  }

  upsertDevice(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-103', { input });
  }

  createDeviceApproval(deviceId: string): Promise<unknown> {
    throw new NotImplemented('T-103', { deviceId });
  }

  consumeDeviceApproval(tokenHash: string): Promise<unknown> {
    throw new NotImplemented('T-103', { tokenHash });
  }

  savePreferences(accountId: string, input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-101', { accountId, input });
  }

  insertFeedback(accountId: string, body: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId, body });
  }

  addBookmark(accountId: string, reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId, reviewId });
  }

  removeBookmark(accountId: string, reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId, reviewId });
  }

  listBookmarks(accountId: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId });
  }

  setBlock(blockerAccountId: string, blockedAccountId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { blockerAccountId, blockedAccountId });
  }

  unsetBlock(blockerAccountId: string, blockedAccountId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { blockerAccountId, blockedAccountId });
  }

  isBlocked(blockerAccountId: string, blockedAccountId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { blockerAccountId, blockedAccountId });
  }
}
