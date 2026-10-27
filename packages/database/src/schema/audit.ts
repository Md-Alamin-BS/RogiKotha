// Audit (02-data-model.md §9, `audit_events` row only — the rest of §9 is
// T-005's moderation module). Append-only; T-005's `0003_append_only.sql`
// attaches the `fn_block_mutation()` trigger to this table alongside its
// own (02-data-model.md §10) since that migration is outside T-004's
// owned paths.
import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, id } from './_common';
import { targetKindEnum } from './enums';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: id(),
    // `case:MOD-2041`, `config`, `identity`, `evidence:<id>`, `account:<id>`, `retention`.
    stream: text('stream').notNull(),
    // Free string (`report`, `warn`, `hide`, `record`, …) — not the
    // `moderation_action` enum (02-data-model.md §9).
    action: text('action').notNull(),
    // Opaque: `account:<id>`, `staff:<id>`, `worker`, `system:<name>`.
    actor: text('actor').notNull(),
    // ASSUMPTION(T-004): the only `target_kind` enum 02-data-model.md §0
    // defines is (review|facility_review|comment|evidence|profile), which
    // does not cover every `stream` this table actually carries (`config`,
    // `identity`, `account:<id>`). Nullable, and left as the closest typed
    // column rather than widening the enum or falling back to free text.
    targetKind: targetKindEnum('target_kind'),
    targetId: uuid('target_id'),
    details: jsonb('details').notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index('audit_events_stream_created_at_idx').on(t.stream, t.createdAt.desc())],
);
