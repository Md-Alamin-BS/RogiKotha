// Reviews / accounts (02-data-model.md §6).
import type { Criterion, CriterionValue } from '@rogikotha/contracts';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id, publicId, timestamps } from './_common';
import { doctors, facilityBranches, profileSubmissions } from './directory';
import {
  followUpKindEnum,
  identityModeEnum,
  outcomeEnum,
  publicationStateEnum,
  relationshipEnum,
  reviewKindEnum,
  sentimentEnum,
  tagGroupEnum,
} from './enums';
import { personas } from './identity';
import { taxonomyTerms } from './taxonomy';

/**
 * `bytea` (encrypted column ciphertext). Drizzle has no built-in mapping;
 * duplicated in `evidence.ts` and `notification.ts` (`_common.ts` is a
 * T-004 file outside this task's owned "Modify" list, so this small helper
 * is not centralised there — see `ISSUES.md` for the follow-up).
 */
export const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

/** `{symptoms?, diagnosis?, treatment?, after?}` — a detailed review's timeline sections. */
export interface ReviewSections {
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  after?: string;
}

/** `[{label, note?}]` — "Reviewer's label", never a validated claim (hard rule). */
export interface ReviewClaim {
  label: string;
  note?: string;
}

export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    publicId: publicId(),
    seedRef: text('seed_ref'),
    authorPersonaId: uuid('author_persona_id')
      .notNull()
      .references(() => personas.id),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id),
    branchId: uuid('branch_id').references(() => facilityBranches.id),
    kind: reviewKindEnum('kind').notNull(),
    relationship: relationshipEnum('relationship').notNull(),
    identityMode: identityModeEnum('identity_mode').notNull(),
    sentiment: sentimentEnum('sentiment'),
    outcome: outcomeEnum('outcome'),
    periodYear: smallint('period_year').notNull(),
    periodMonth: smallint('period_month').notNull(),
    // Private (02-data-model.md §6).
    exactDateEnc: bytea('exact_date_enc'),
    title: text('title').notNull(),
    // Quick reviews use `body`; detailed reviews use `sections` instead
    // (task step 1 / 02-data-model.md §6) — both nullable, exactly which one
    // is populated is a domain rule (`kind`), not a DB constraint.
    body: text('body'),
    sections: jsonb('sections').$type<ReviewSections>(),
    claims: jsonb('claims').$type<ReviewClaim[]>().notNull().default([]),
    // ASSUMPTION(T-005): no top-level enum exists for this three-value set
    // (02-data-model.md §0 lists no `language` enum); a local literal union
    // plus a CHECK constraint gives the same DB-level guarantee a pgEnum
    // would without adding one to `schema/enums.ts` (outside this task's
    // owned paths) — see ISS row.
    language: text('language', { enum: ['en', 'bn', 'mixed'] as const }).notNull(),
    state: publicationStateEnum('state').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReasonCode: text('hidden_reason_code'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    restoreUntil: timestamp('restore_until', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    latestStatus: text('latest_status'),
    attestationAt: timestamp('attestation_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('reviews_doctor_id_state_idx').on(t.doctorId, t.state),
    index('reviews_branch_id_state_idx').on(t.branchId, t.state),
    index('reviews_author_persona_id_idx').on(t.authorPersonaId),
    check('reviews_language_check', sql`${t.language} in ('en', 'bn', 'mixed')`),
  ],
);

export const reviewTags = pgTable(
  'review_tags',
  {
    id: id(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    group: tagGroupEnum('group').notNull(),
    termId: uuid('term_id').references(() => taxonomyTerms.id),
    freeText: text('free_text'),
    notSure: boolean('not_sure').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'review_tags_one_of_term_free_text_not_sure',
      sql`(
        (case when ${t.termId} is not null then 1 else 0 end) +
        (case when ${t.freeText} is not null then 1 else 0 end) +
        (case when ${t.notSure} then 1 else 0 end)
      ) = 1`,
    ),
  ],
);

export const reviewVersions = pgTable(
  'review_versions',
  {
    id: id(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    // ASSUMPTION(T-005): local literal unions (no top-level enum defined for
    // either in 02-data-model.md §0); CHECK constraints enforce them at the DB
    // level rather than repeating the TS-only-enum gap `ISS-110` found.
    changeKind: text('change_kind', {
      enum: ['publish', 'correction', 'moderation_redaction', 'restore'] as const,
    }).notNull(),
    reason: text('reason'),
    actorKind: text('actor_kind', { enum: ['author', 'moderator', 'system'] as const }).notNull(),
    // ASSUMPTION(T-005): 02-data-model.md §6 names `actor_id` with no FK
    // target. Opaque: an account id for `author`/`moderator`, null for
    // `system` — the meaning depends on `actorKind`, matching the
    // `audit_events.actor` opaque-string convention used elsewhere in this
    // data model, kept as a plain `uuid` rather than an FK to `accountProfiles`
    // since a `system` row has no account at all.
    actorId: uuid('actor_id'),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'review_versions_change_kind_check',
      sql`${t.changeKind} in ('publish', 'correction', 'moderation_redaction', 'restore')`,
    ),
    check(
      'review_versions_actor_kind_check',
      sql`${t.actorKind} in ('author', 'moderator', 'system')`,
    ),
  ],
);

export const reviewFollowUps = pgTable(
  'review_follow_ups',
  {
    id: id(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    kind: followUpKindEnum('kind').notNull(),
    datedYear: smallint('dated_year').notNull(),
    datedMonth: smallint('dated_month').notNull(),
    body: text('body').notNull(),
    laterProviderText: text('later_provider_text'),
    laterDoctorId: uuid('later_doctor_id').references(() => doctors.id),
    // ASSUMPTION(T-005): 02-data-model.md §0 defines no dedicated enum for a
    // follow-up's own lifecycle; reuses `publication_state` as the closest
    // existing enum (same precedent as `ISS-090`), not a perfect fit.
    state: publicationStateEnum('state').notNull().default('published'),
    createdAt: createdAt(),
  },
  (t) => [
    index('review_follow_ups_review_id_dated_idx').on(
      t.reviewId,
      t.datedYear.desc(),
      t.datedMonth.desc(),
    ),
  ],
);

export const reviewDrafts = pgTable(
  'review_drafts',
  {
    id: id(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    reviewId: uuid('review_id').references(() => reviews.id),
    kind: reviewKindEnum('kind').notNull(),
    // Private — encrypted composer state (02-data-model.md §6).
    payloadEnc: bytea('payload_enc').notNull(),
    doctorId: uuid('doctor_id').references(() => doctors.id),
    blockedOnSubmissionId: uuid('blocked_on_submission_id').references(() => profileSubmissions.id),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 days'`),
  },
  (t) => [index('review_drafts_account_id_updated_at_idx').on(t.accountId, t.updatedAt.desc())],
);

export const facilityReviews = pgTable(
  'facility_reviews',
  {
    id: id(),
    publicId: publicId(),
    seedRef: text('seed_ref'),
    authorPersonaId: uuid('author_persona_id')
      .notNull()
      .references(() => personas.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => facilityBranches.id),
    identityMode: identityModeEnum('identity_mode').notNull(),
    periodYear: smallint('period_year').notNull(),
    periodMonth: smallint('period_month').notNull(),
    body: text('body').notNull(),
    // `{staff: 'good', …, reportTime: null}` — never joins to a doctor's
    // aggregates (02-data-model.md §6 note; hard-rule checklist).
    criteria: jsonb('criteria')
      .$type<Partial<Record<Criterion, CriterionValue | null>>>()
      .notNull()
      .default({}),
    state: publicationStateEnum('state').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    restoreUntil: timestamp('restore_until', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('facility_reviews_branch_id_state_idx').on(t.branchId, t.state)],
);
