// `Logger` port fake (03-routes-and-contracts.md §3:
// `info|warn|error(event, fields)`). Task step 5: "CollectingLogger".
export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: Record<string, unknown>;
}

export class CollectingLogger {
  readonly entries: LogEntry[] = [];

  info(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'info', event, fields });
  }

  warn(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'warn', event, fields });
  }

  error(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'error', event, fields });
  }
}
