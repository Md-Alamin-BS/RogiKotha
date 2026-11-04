// `Logger` port fake: collects every line so a test can assert on events and scan the fields.
import type { LogFields, Logger } from '@rogikotha/application';

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: LogFields;
}

export class CollectingLogger implements Logger {
  readonly entries: LogEntry[] = [];

  info(event: string, fields: LogFields = {}): void {
    this.entries.push({ level: 'info', event, fields });
  }

  warn(event: string, fields: LogFields = {}): void {
    this.entries.push({ level: 'warn', event, fields });
  }

  error(event: string, fields: LogFields = {}): void {
    this.entries.push({ level: 'error', event, fields });
  }

  events(): string[] {
    return this.entries.map((entry) => entry.event);
  }
}
