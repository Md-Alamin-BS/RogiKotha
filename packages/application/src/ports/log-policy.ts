// The one rule set both loggers apply to every line (ENT-012, BR6.1–BR6.3). It has no runtime
// import, so the web logger and the worker reach the same code through either package entry.
import type { LogFields } from './logger';

export const SCRUBBED = '[scrubbed]';
export const INVALID_EVENT = 'log.invalid_event';

// A `Record` over `keyof LogFields` fails to compile when a Unit adds a `LogFields` key without
// adding it here, or lists a name `LogFields` does not have (BR6.1).
const LOG_FIELD_SET: Record<keyof LogFields, true> = {
  correlationId: true,
  accountId: true,
  deliveryId: true,
  sessionId: true,
  jobId: true,
  command: true,
  messageKey: true,
  status: true,
  errorCode: true,
  errorName: true,
  purpose: true,
  kind: true,
  attempts: true,
  count: true,
  durationMs: true,
  retryAfterSec: true,
};

export type LogFieldName = keyof LogFields;

export const LOG_FIELD_NAMES: readonly LogFieldName[] = Object.freeze(
  Object.keys(LOG_FIELD_SET) as LogFieldName[],
);

const VALUE_SHAPE = /^[A-Za-z0-9._:-]{1,120}$/;
// UUIDs pass, because their hyphen-separated groups are at most 12 characters.
const TOKEN_RUN = /[A-Za-z0-9]{32,}/;
const FILE_EXTENSION =
  /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|pdf|docx?|xlsx?|pptx?|txt|rtf|zip|rar|7z|exe|msi|js|html?)$/i;
const EVENT_SHAPE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+){0,4}$/;
const MAX_EVENT_LENGTH = 80;
const MAX_ARRAY_ITEMS = 20;

function scrubScalar(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : SCRUBBED;
  if (typeof value === 'string') {
    const codeShaped =
      VALUE_SHAPE.test(value) && !TOKEN_RUN.test(value) && !FILE_EXTENSION.test(value);
    return codeShaped ? value : SCRUBBED;
  }
  return SCRUBBED;
}

/** Returns the value as written to the log, or `undefined` when the field is dropped (BR6.2). */
export function scrubLogValue(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  // ASSUMPTION(U41): an array longer than 20 items keeps its first 20; the rest are not written.
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(scrubScalar);
  return scrubScalar(value);
}

export function scrubLogFields(
  // `object`, because `LogFields` is an interface and has no index signature.
  fields: object | undefined,
  allowed: ReadonlySet<string>,
): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  if (fields === undefined || fields === null) return kept;
  for (const [name, value] of Object.entries(fields) as [string, unknown][]) {
    if (!allowed.has(name)) continue;
    const written = scrubLogValue(value);
    if (written !== undefined) kept[name] = written;
  }
  return kept;
}

/** The event, or `log.invalid_event` when data was interpolated into it (BR6.3). */
export function logEventName(event: unknown): string {
  return typeof event === 'string' && event.length <= MAX_EVENT_LENGTH && EVENT_SHAPE.test(event)
    ? event
    : INVALID_EVENT;
}
