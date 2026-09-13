// Shared column helpers so every table's primary key, timestamps and public
// id are built the same way (01-conventions.md §4).
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { customType, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** `uuid primary key`, app- and db-generated (PostgreSQL 18's built-in `uuidv7()`). */
export function id() {
  return uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);
}

/** `created_at timestamptz not null default now()`. */
export function createdAt() {
  return timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
}

/** `created_at` + `updated_at` for tables whose rows are updated in place. */
export function timestamps() {
  return {
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  };
}

/** `public_id text unique not null` — the 10-char base32 id, never the uuid pk. */
export function publicId() {
  return text('public_id').notNull().unique();
}

/**
 * PostgreSQL `citext` (case-insensitive text), enabled by
 * `infra/compose/postgres-init/02-extensions.sql`. Drizzle has no built-in
 * mapping for it, hence `customType`.
 */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

/** `where <column> is not null` — the condition for a partial unique index on a nullable `seed_ref`/similar column. */
export function wherePresent(column: AnyPgColumn) {
  return sql`${column} is not null`;
}
