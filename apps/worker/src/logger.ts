// Minimal structured JSON logger (task step 4), matching the `Logger` port
// shape from 03-routes-and-contracts.md §3 (`info|warn|error(event, fields)`).
// Hard rule (01-conventions.md §11): logs carry only allowlisted fields —
// never emails, tokens, bodies, file names or passwords. The shared log
// policy keeps only allowlisted keys with id- or code-shaped values (BR6.1–BR6.3).
import {
  LOG_FIELD_NAMES,
  SCRUBBED,
  logEventName,
  scrubLogFields,
} from '@rogikotha/application/worker';

/** Names only the worker logs (ENT-012); `fix` holds `db.reset_required`, `variables` env names. */
export const WORKER_LOG_FIELD_NAMES = [
  'eventName',
  'eventId',
  'job',
  'queue',
  'queues',
  'outboxPending',
  'code',
  'expectedPolicy',
  'actualPolicy',
  'fix',
  'errorName',
  'sqlState',
  'mode',
  'jobs',
  'signal',
  'message',
  'variables',
] as const;

const ALLOWED_FIELDS: ReadonlySet<string> = new Set<string>([
  ...LOG_FIELD_NAMES,
  ...WORKER_LOG_FIELD_NAMES,
]);

// `packages/database/src/queue/pg-boss-queue.ts` relies on this structural shape.
export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

/** Fields that hold an error's own text: only their presence is written (ISS-697). */
const FREE_TEXT_FIELDS: readonly string[] = ['message'];

function scrubbed(fields: LogFields): Record<string, unknown> {
  const kept = scrubLogFields(fields, ALLOWED_FIELDS);
  // A message such as `LOGSCRUB-THROW-7Q` passes the id-or-code value shape, yet it is still
  // whatever text the thrower chose (U41 adversarial A4).
  for (const name of FREE_TEXT_FIELDS) if (name in kept) kept[name] = SCRUBBED;
  return kept;
}

function write(level: 'info' | 'warn' | 'error', event: string, fields: LogFields): void {
  // The three fixed keys are spread last so they always win — a caller
  // passing a field literally named `ts`, `level` or `event` (e.g. the
  // outbox relay logging the *outbox* event's own name) must never silently
  // overwrite this line's own envelope fields.
  const line = JSON.stringify({
    ...scrubbed(fields),
    ts: new Date().toISOString(),
    level,
    event: logEventName(event),
  });
  // eslint-disable-next-line no-console -- the logger's whole job is one JSON line to stdout.
  console.log(line);
}

export class JsonLogger implements Logger {
  info(event: string, fields: LogFields = {}): void {
    write('info', event, fields);
  }

  warn(event: string, fields: LogFields = {}): void {
    write('warn', event, fields);
  }

  error(event: string, fields: LogFields = {}): void {
    write('error', event, fields);
  }
}
