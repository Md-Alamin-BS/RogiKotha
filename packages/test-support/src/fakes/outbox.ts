// `Outbox` port fake: keeps every appended event; a rollback drops the ones its transaction wrote.
import type { Outbox, OutboxEventName, OutboxPayloads, Tx } from '@rogikotha/application';

import type { Transactional } from './unit-of-work.js';

export interface OutboxRecord {
  name: OutboxEventName;
  payload: OutboxPayloads[OutboxEventName];
}

export class ListOutbox implements Outbox, Transactional {
  events: OutboxRecord[] = [];

  append<N extends OutboxEventName>(_tx: Tx, name: N, payload: OutboxPayloads[N]): Promise<void> {
    void _tx;
    this.events.push({ name, payload: { ...payload } });
    return Promise.resolve();
  }

  snapshot(): unknown {
    return [...this.events];
  }

  restore(state: unknown): void {
    this.events = [...(state as OutboxRecord[])];
  }
}
