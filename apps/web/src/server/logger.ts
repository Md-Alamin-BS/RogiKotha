// The web tier's `Logger` port: one JSON line per event under the shared log policy (BR8.1,
// BR6.1–BR6.4). The port's types already close the field list; the runtime filter also drops
// anything a cast let in, and every kept value must look like an id or a code.
import {
  LOG_FIELD_NAMES,
  logEventName,
  scrubLogFields,
  type LogFields,
  type Logger,
} from '@rogikotha/application';

const ALLOWED_FIELDS: ReadonlySet<string> = new Set<string>(LOG_FIELD_NAMES);

export type LogLevel = 'info' | 'warn' | 'error';

export function formatLogLine(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
  at: Date = new Date(),
): string {
  const name = logEventName(event);
  const line: Record<string, unknown> = {
    level,
    event: name,
    ...scrubLogFields(fields, ALLOWED_FIELDS),
  };
  // Re-asserted after the fields, so no field can overwrite the envelope (BR6.4).
  line.level = level;
  line.event = name;
  line.at = at.toISOString();
  return JSON.stringify(line);
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
