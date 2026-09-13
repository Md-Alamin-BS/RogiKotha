// `Outbox` port fake (03-routes-and-contracts.md §3: `append(tx, name, payload)`).
// Task step 5: "ListOutbox".
export interface OutboxRecord {
  name: string;
  payload: Record<string, unknown>;
}

export class ListOutbox {
  readonly events: OutboxRecord[] = [];

  // `tx` is unused here — this fake has no real transaction, unlike
  // `PgOutbox` (packages/database/src/repositories/outbox.ts), which must
  // append inside the caller's transaction.
  append(_tx: unknown, name: string, payload: Record<string, unknown>): Promise<void> {
    void _tx;
    this.events.push({ name, payload });
    return Promise.resolve();
  }
}
