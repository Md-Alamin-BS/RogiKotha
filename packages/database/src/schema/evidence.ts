// Evidence (02-data-model.md §7, AD-6, AD-7).
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id, publicId } from './_common';
import {
  artifactKindEnum,
  custodyEventEnum,
  evidenceFailReasonEnum,
  evidenceGroupEnum,
  evidenceStateEnum,
} from './enums';
import { legalHolds } from './retention';
import { reviews } from './review';

/**
 * `bytea` — duplicated from `review.ts` (see that file's comment); `_common.ts`
 * is outside this task's owned "Modify" list.
 */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// Phase 1 accepts images only (FD-036); PDF/HEIC/Office wait for Phase 2.
const PHASE1_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export const evidenceItems = pgTable(
  'evidence_items',
  {
    id: id(),
    publicId: publicId(),
    seedRef: text('seed_ref'),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    group: evidenceGroupEnum('group').notNull(),
    labelEn: text('label_en'),
    labelBn: text('label_bn'),
    state: evidenceStateEnum('state').notNull(),
    failReason: evidenceFailReasonEnum('fail_reason'),
    // ASSUMPTION(T-005): `declared_mime`/`detected_mime` are free `text` in
    // 02-data-model.md §7, not a top-level enum; a local literal union plus
    // the CHECK constraints below (task's own "declared MIME ∈
    // {image/jpeg, image/png}" rule, FD-036) gives the same DB-level
    // guarantee a pgEnum would without widening `schema/enums.ts` (outside
    // this task's owned paths) or repeating the TS-only-enum gap `ISS-110`
    // found. Phase 2 widens `PHASE1_MIME_TYPES`, not the enum's own shape.
    declaredMime: text('declared_mime', { enum: PHASE1_MIME_TYPES }).notNull(),
    detectedMime: text('detected_mime', { enum: PHASE1_MIME_TYPES }),
    originalBytes: bigint('original_bytes', { mode: 'number' }).notNull(),
    originalSha256: text('original_sha256').notNull(),
    // Private (02-data-model.md §7).
    originalFilenameEnc: bytea('original_filename_enc').notNull(),
    pageCount: integer('page_count').notNull().default(1),
    // Private. `0005_grants_part2.sql` grants `rk_worker` table-wide SELECT on
    // `evidence_items`, so the database does not hide this column; BR4.8 keeps
    // it out of the worker's column list (U48, R-06).
    uploadedByAccountId: uuid('uploaded_by_account_id')
      .notNull()
      .references(() => accountProfiles.id),
    retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }),
    holdId: uuid('hold_id').references(() => legalHolds.id),
    // Deferred, deferrable FK to `evidence_artifacts` — Drizzle 0.45's
    // foreign-key builder has no `deferrable`/`initiallyDeferred` option, so
    // the actual constraint is raw SQL in `0005_deferred_fks.sql` (task step
    // 9); this stays a plain column here.
    publishedArtifactId: uuid('published_artifact_id'),
    idempotencyKey: text('idempotency_key').unique(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    index('evidence_items_review_id_group_idx').on(t.reviewId, t.group),
    index('evidence_items_state_idx').on(t.state),
    index('evidence_items_retention_expires_at_idx')
      .on(t.retentionExpiresAt)
      .where(sql`${t.holdId} is null and ${t.state} = 'published'`),
    check(
      'evidence_items_declared_mime_check',
      sql`${t.declaredMime} in ('image/jpeg', 'image/png')`,
    ),
    check(
      'evidence_items_detected_mime_check',
      sql`${t.detectedMime} is null or ${t.detectedMime} in ('image/jpeg', 'image/png')`,
    ),
  ],
);

export const evidenceArtifacts = pgTable(
  'evidence_artifacts',
  {
    id: id(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => evidenceItems.id, { onDelete: 'cascade' }),
    kind: artifactKindEnum('kind').notNull(),
    pageNo: integer('page_no'),
    storageKey: text('storage_key').notNull().unique(),
    sha256: text('sha256').notNull(),
    bytes: integer('bytes').notNull(),
    mime: text('mime').notNull(),
    width: integer('width'),
    height: integer('height'),
    sanitiserVersion: text('sanitiser_version'),
    scannerVersion: text('scanner_version'),
    signatureVersion: text('signature_version'),
    immutable: boolean('immutable').notNull().default(true),
    // True only for `page_png`/`derivative_pdf`/`thumbnail` of a *published*
    // item — enforced at the application layer (evidence.publish); the
    // database only refuses the one case that must never happen (hard rule
    // checklist: "Original evidence is never served publicly").
    public: boolean('public').notNull().default(false),
    supersededById: uuid('superseded_by_id').references((): AnyPgColumn => evidenceArtifacts.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('evidence_artifacts_item_id_kind_page_no_idx').on(t.itemId, t.kind, t.pageNo),
    check(
      'evidence_artifacts_original_not_public_check',
      sql`not (${t.kind} = 'original' and ${t.public})`,
    ),
  ],
);

export const evidenceRedactions = pgTable('evidence_redactions', {
  id: id(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => evidenceItems.id, { onDelete: 'cascade' }),
  pageNo: integer('page_no').notNull(),
  // `[{x, y, w, h}]` in page pixels (02-data-model.md §7).
  rects: jsonb('rects').$type<{ x: number; y: number; w: number; h: number }[]>().notNull(),
  appliedToArtifactId: uuid('applied_to_artifact_id')
    .notNull()
    .references(() => evidenceArtifacts.id),
  createdAt: createdAt(),
});

export const evidenceCustodyEvents = pgTable('evidence_custody_events', {
  id: id(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => evidenceItems.id, { onDelete: 'cascade' }),
  event: custodyEventEnum('event').notNull(),
  // Opaque: `account:<id>`, `worker`, `system:retention`.
  actor: text('actor').notNull(),
  details: jsonb('details').notNull().default({}),
  createdAt: createdAt(),
});
