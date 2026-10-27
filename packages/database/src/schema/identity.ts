// Identity (02-data-model.md §3, AD-3). `personas` is public and carries no
// account column; `persona_links` is the private linkage table, excluded
// from `rk_worker` grants by `0001_grants_part1.sql` (ISS-111 item 3: this
// comment named `0002_grants_part1.sql` before T-005; the file is
// `0001_grants_part1.sql` after T-004's own drizzle-kit renumbering,
// `ISS-085`).
import { boolean, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id } from './_common';
import { identityModeEnum, staffRoleEnum, targetKindEnum } from './enums';

export const personas = pgTable('personas', {
  id: id(),
  kind: identityModeEnum('kind').notNull(),
  // Snapshot: a rename creates a new persona row so old content keeps the
  // old display name (02-data-model.md §3 "Rules").
  displayName: text('display_name').notNull(),
  username: text('username'),
  avatarHue: smallint('avatar_hue'),
  createdAt: createdAt(),
});

export const personaLinks = pgTable('persona_links', {
  personaId: uuid('persona_id')
    .primaryKey()
    .references(() => personas.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  // Set for `anonymous` personas: the alias is scoped to one review thread.
  // `reviews` now exists (T-005, `schema/review.ts`), but `review.ts` itself
  // imports `personas` from this file (`reviews.author_persona_id`), so a
  // Drizzle `.references()` here would be a circular import between the two
  // schema files. Left a plain `uuid` column; the real FK constraint is
  // added by raw SQL in `0005_deferred_fks.sql` instead.
  reviewId: uuid('review_id'),
  createdAt: createdAt(),
});

export const identityReveals = pgTable('identity_reveals', {
  id: id(),
  requesterAccountId: uuid('requester_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  requesterRole: staffRoleEnum('requester_role').notNull(),
  // ASSUMPTION(T-004): 02-data-model.md §0 defines exactly one `target_kind`
  // enum (review|facility_review|comment|evidence|profile); reused here as
  // the closest matching typed column since no separate identity-reveal
  // target-kind list exists in the data model.
  targetKind: targetKindEnum('target_kind').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  granted: boolean('granted').notNull(),
  revealedAccountId: uuid('revealed_account_id').references(() => accountProfiles.id),
  createdAt: createdAt(),
});
