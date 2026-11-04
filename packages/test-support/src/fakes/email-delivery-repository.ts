// `EmailDeliveryRepository` port fake (T-101 BR6.1, BR6.3, BR6.8): the final statuses clear the
// params in the same write, as the real methods do, and a rollback drops uncommitted rows.
import type {
  Clock,
  EmailDeliveryErrorCode,
  EmailDeliveryRecord,
  EmailDeliveryRepository,
  EmailMessageKey,
  NewEmailDelivery,
  Tx,
} from '@rogikotha/application';

import type { Transactional } from './unit-of-work.js';

export class FakeEmailDeliveryRepository implements EmailDeliveryRepository, Transactional {
  private rows = new Map<string, EmailDeliveryRecord>();

  constructor(private readonly clock: Clock) {}

  /** Every delivery, oldest first. */
  all(): EmailDeliveryRecord[] {
    return [...this.rows.values()].map((row) => ({ ...row }));
  }

  insert(_tx: Tx, row: NewEmailDelivery): Promise<void> {
    if (row.dedupeKey !== null && this.byDedupeKey(row.dedupeKey)) {
      return Promise.reject(new Error('FakeEmailDeliveryRepository: duplicate dedupe_key'));
    }
    this.rows.set(row.id, {
      ...row,
      params: { ...row.params },
      status: 'queued',
      attempts: 0,
      lastErrorCode: null,
      sentAt: null,
      createdAt: this.clock.now(),
    });
    return Promise.resolve();
  }

  findById(_tx: Tx, id: string): Promise<EmailDeliveryRecord | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? { ...row } : null);
  }

  findByDedupeKey(_tx: Tx, dedupeKey: string): Promise<{ id: string } | null> {
    const row = this.byDedupeKey(dedupeKey);
    return Promise.resolve(row ? { id: row.id } : null);
  }

  findRecent(
    _tx: Tx,
    query: { accountId: string; messageKey: EmailMessageKey; since: Date },
  ): Promise<{ id: string; createdAt: Date } | null> {
    const recent = [...this.rows.values()]
      .filter(
        (row) =>
          row.accountId === query.accountId &&
          row.messageKey === query.messageKey &&
          row.createdAt.getTime() >= query.since.getTime(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return Promise.resolve(recent ? { id: recent.id, createdAt: recent.createdAt } : null);
  }

  recordAttempt(
    _tx: Tx,
    id: string,
    errorCode: EmailDeliveryErrorCode,
  ): Promise<{ attempts: number }> {
    return this.update(id, (row) => ({
      ...row,
      attempts: row.attempts + 1,
      lastErrorCode: errorCode,
    })).then((row) => ({ attempts: row.attempts }));
  }

  markSent(_tx: Tx, id: string, sentAt: Date): Promise<void> {
    return this.update(id, (row) => ({
      ...row,
      status: 'sent',
      sentAt,
      attempts: row.attempts + 1,
      params: {},
    })).then(() => undefined);
  }

  markFailed(_tx: Tx, id: string, errorCode: EmailDeliveryErrorCode): Promise<void> {
    return this.update(id, (row) => ({
      ...row,
      status: 'failed',
      lastErrorCode: errorCode,
      params: {},
    })).then(() => undefined);
  }

  snapshot(): unknown {
    return new Map(this.rows);
  }

  restore(state: unknown): void {
    this.rows = new Map(state as Map<string, EmailDeliveryRecord>);
  }

  private byDedupeKey(dedupeKey: string): EmailDeliveryRecord | undefined {
    return [...this.rows.values()].find((row) => row.dedupeKey === dedupeKey);
  }

  private update(
    id: string,
    change: (row: EmailDeliveryRecord) => EmailDeliveryRecord,
  ): Promise<EmailDeliveryRecord> {
    const row = this.rows.get(id);
    if (!row) return Promise.reject(new Error(`FakeEmailDeliveryRepository: no delivery ${id}`));
    const next = change(row);
    this.rows.set(id, next);
    return Promise.resolve(next);
  }
}
