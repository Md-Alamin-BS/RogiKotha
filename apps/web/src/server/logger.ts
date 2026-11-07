// The web tier's `Logger` port: one JSON line per event with allowlisted fields only (BR8.1). The
// port's types already close the field list; the runtime filter also drops anything a cast let in.
import type { LogFields, Logger } from '@rogikotha/application';

const ALLOWED_FIELDS: ReadonlySet<string> = new Set<keyof LogFields>([
  'correlationId',
  'accountId',
  'deliveryId',
  'sessionId',
  'jobId',
  'command',
  'messageKey',
  'status',
  'errorCode',
  'purpose',
  'kind',
  'attempts',
  'count',
  'durationMs',
  'retryAfterSec',
  'itemId',
  'state',
  'failReason',
  'attempt',
  'errorClass',
]);

export type LogLevel = 'info' | 'warn' | 'error';

export function formatLogLine(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
  at: Date = new Date(),
): string {
  const kept: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.has(name) && value !== undefined) kept[name] = value;
  }
  return JSON.stringify({ level, event, ...kept, at: at.toISOString() });
}

export function createWebLogger(
  write: (level: LogLevel, line: string) => void = writeLine,
): Logger {
  return {
    info: (event, fields) => write('info', formatLogLine('info', event, fields)),
    warn: (event, fields) => write('warn', formatLogLine('warn', event, fields)),
    error: (event, fields) => write('error', formatLogLine('error', event, fields)),
  };
}

function writeLine(level: LogLevel, line: string): void {
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else process.stdout.write(`${line}\n`);
}
