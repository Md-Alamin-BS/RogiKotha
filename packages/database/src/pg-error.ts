// node-postgres errors reach callers wrapped in Drizzle's `DrizzleQueryError`; the PostgreSQL code
// and constraint name sit on the wrapped `cause`.
const UNIQUE_VIOLATION = '23505';

interface PgErrorFields {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

/** The constraint a unique violation names, looking through wrapping errors; otherwise null. */
export function uniqueViolationConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const fields = current as PgErrorFields;
    if (fields.code === UNIQUE_VIOLATION && typeof fields.constraint === 'string') {
      return fields.constraint;
    }
    current = fields.cause;
  }
  return null;
}
