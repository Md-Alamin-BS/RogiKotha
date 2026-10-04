// Community (02-data-model.md §8).
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { boolean, check, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account.js';
import { createdAt, id, publicId } from './_common.js';
import { publicationStateEnum, reactionValueEnum } from './enums.js';
import { personas } from './identity.js';
import { reviews } from './review.js';

export const comments = pgTable('comments', {
  id: id(),
  publicId: publicId(),
  seedRef: text('seed_ref'),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviews.id, { onDelete: 'cascade' }),
  // One reply level: a comment whose own `parent_id` is set can never be a
  // parent itself — domain-enforced (01-conventions.md §3) **and**
  // database-enforced by the `fn_comment_depth()` trigger (task step 4,
  // `0004_triggers.sql`), not a column-level constraint here.
  parentId: uuid('parent_id').references((): AnyPgColumn => comments.id),
  authorPersonaId: uuid('author_persona_id')
    .notNull()
    .references(() => personas.id),
  body: text('body').notNull(),
  hasExternalLink: boolean('has_external_link').notNull().default(false),
  state: publicationStateEnum('state').notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // True when deleted but replies still exist (02-data-model.md §8).
  tombstone: boolean('tombstone').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const commentMentions = pgTable(
  'comment_mentions',
  {
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    // Anonymous personas cannot be mentioned — domain-enforced
    // (`comment.post`'s `community.mention_anonymous` refusal), not a DB
    // constraint (would need a cross-table check on `personas.kind`).
    mentionedPersonaId: uuid('mentioned_persona_id')
      .notNull()
      .references(() => personas.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.mentionedPersonaId] })],
);

export const reactions = pgTable(
  'reactions',
  {
    id: id(),
    // ASSUMPTION(T-005): narrower than the shared `target_kind` enum
    // (review|facility_review|comment|evidence|profile) — reactions never
    // target evidence or a profile (02-data-model.md §8). A local literal
    // union plus a CHECK constraint avoids both widening the shared enum
    // (outside this task's owned `schema/enums.ts`) and the TS-only-enum gap
    // `ISS-110` found.
    targetKind: text('target_kind', { enum: ['review', 'facility_review', 'comment'] as const }).notNull(),
    targetId: uuid('target_id').notNull(),
    // Private.
    accountId: uuid('account_id')
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    // Null when the actor's identity on that thread is anonymous.
    publicPersonaId: uuid('public_persona_id').references(() => personas.id),
    value: reactionValueEnum('value').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('reactions_target_account_unique').on(t.targetKind, t.targetId, t.accountId),
    check('reactions_target_kind_check', sql`${t.targetKind} in ('review', 'facility_review', 'comment')`),
  ],
);
