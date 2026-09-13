// Identity (02-data-model.md §3, AD-3). `personas` is public and carries no
// account column; `persona_links` is the private linkage table, excluded
// from `rk_worker` grants by `0002_grants_part1.sql`.
import { boolean, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account.js';
import { createdAt, id } from './_common.js';
import { identityModeEnum, staffRoleEnum, targetKindEnum } from './enums.js';

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
  // `reviews` does not exist until T-005 (task step 7); plain `uuid`
  // column, no FK; T-005's `0005_deferred_fks.sql` adds it.
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
