// Minimal structured JSON logger (task step 4), matching the `Logger` port
// shape from 03-routes-and-contracts.md §3 (`info|warn|error(event, fields)`).
// Hard rule (01-conventions.md §11): logs carry only allowlisted fields —
// never emails, tokens, bodies, file names or passwords. Redaction is a
// last line of defence in case a caller passes one of those by mistake.
const REDACTED_KEY = /email|token|body|filename|password/i;
const REDACTED_VALUE = '[redacted]';

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = REDACTED_KEY.test(key) ? REDACTED_VALUE : value;
  }
  return out;
}

function write(level: 'info' | 'warn' | 'error', event: string, fields: LogFields): void {
  // The three fixed keys are spread last so they always win — a caller
  // passing a field literally named `ts`, `level` or `event` (e.g. the
  // outbox relay logging the *outbox* event's own name) must never silently
  // overwrite this line's own envelope fields.
  const line = JSON.stringify({ ...redact(fields), ts: new Date().toISOString(), level, event });
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
