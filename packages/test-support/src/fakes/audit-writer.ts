// `AuditWriter` port fake (03-routes-and-contracts.md §3:
// `write(tx, {stream, action, actor, target, details})`). Task step 5: "ListAuditWriter".
export interface AuditRecord {
  stream: string;
  action: string;
  actor: string;
  target?: { kind: string; id: string };
  details: Record<string, unknown>;
}

export class ListAuditWriter {
  readonly events: AuditRecord[] = [];

  write(
    _tx: unknown,
    entry: {
      stream: string;
      action: string;
      actor: string;
      target?: { kind: string; id: string };
      details?: Record<string, unknown>;
    },
  ): Promise<void> {
    void _tx;
    this.events.push({ ...entry, details: entry.details ?? {} });
    return Promise.resolve();
  }
}
