// `AuditWriter` port fake: keeps every entry in order; a rollback of `InMemoryUnitOfWork` drops
// the entries its transaction wrote.
import type { AuditEntry, AuditWriter, Tx } from '@rogikotha/application';

import type { Transactional } from './unit-of-work.js';

export type AuditRecord = AuditEntry;

export class ListAuditWriter implements AuditWriter, Transactional {
  events: AuditRecord[] = [];

  write(_tx: Tx, entry: AuditEntry): Promise<void> {
    void _tx;
    this.events.push(JSON.parse(JSON.stringify(entry)) as AuditRecord);
    return Promise.resolve();
  }

  actions(): string[] {
    return this.events.map((event) => event.action);
  }

  snapshot(): unknown {
    return [...this.events];
  }

  restore(state: unknown): void {
    this.events = [...(state as AuditRecord[])];
  }
}
