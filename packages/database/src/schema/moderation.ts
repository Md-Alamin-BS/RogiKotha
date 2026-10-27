// Moderation (02-data-model.md §9, AD-12). `audit_events` already exists
// from T-004 (`schema/audit.ts`) — not re-declared here.
import { sql } from 'drizzle-orm';
import { boolean, integer, jsonb, pgSequence, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id } from './_common';
import { appealStatusEnum, caseStatusEnum, moderationActionEnum, moderationLaneEnum, reportReasonEnum, targetKindEnum } from './enums';
import { reviews } from './review';

// Backs `moderation_cases.code`'s `'MOD-' || nextval(...)` default (task
// step 5). The seed uses fixed codes `MOD-2011`..`MOD-2041`; new cases start
// after that block.
export const moderationCaseSeq = pgSequence('moderation_case_seq', { startWith: 2050 });

export const reports = pgTable(
  'reports',
  {
    id: id(),
    targetKind: targetKindEnum('target_kind').notNull(),
    targetId: uuid('target_id').notNull(),
    reviewId: uuid('review_id').references(() => reviews.id),
    // **Restricted** — never reaches the reported party or any public
    // projection (01-conventions.md §5); `rk_worker` is granted SELECT on
    // this table's other columns only, not this one (0006_grants_part2.sql).
    reporterAccountId: uuid('reporter_account_id')
      .notNull()
      .references(() => accountProfiles.id),
    reason: reportReasonEnum('reason').notNull(),
    detail: text('detail'),
    evidenceNote: text('evidence_note'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('reports_target_reporter_unique').on(t.targetKind, t.targetId, t.reporterAccountId)],
);

export const moderationCases = pgTable('moderation_cases', {
  id: id(),
  code: text('code')
    .notNull()
    .unique()
    .default(sql`('MOD-' || nextval('moderation_case_seq'))`),
  lane: moderationLaneEnum('lane').notNull(),
  status: caseStatusEnum('status').notNull(),
  targetKind: targetKindEnum('target_kind').notNull(),
  targetId: uuid('target_id').notNull(),
  reviewId: uuid('review_id').references(() => reviews.id),
  reportCount: integer('report_count').notNull().default(0),
  distinctReporters: integer('distinct_reporters').notNull().default(0),
  autoHidden: boolean('auto_hidden').notNull().default(false),
  coordinatedSignal: boolean('coordinated_signal').notNull().default(false),
  summaryEn: text('summary_en'),
  summaryBn: text('summary_bn'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  slaDueAt: timestamp('sla_due_at', { withTimezone: true }),
  assignedTo: uuid('assigned_to').references(() => accountProfiles.id),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const moderationCaseReasons = pgTable(
  'moderation_case_reasons',
  {
    caseId: uuid('case_id')
      .notNull()
      .references(() => moderationCases.id, { onDelete: 'cascade' }),
    reason: reportReasonEnum('reason').notNull(),
    count: integer('count').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.caseId, t.reason] })],
);

export const moderationDecisions = pgTable('moderation_decisions', {
  id: id(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => moderationCases.id, { onDelete: 'cascade' }),
  action: moderationActionEnum('action').notNull(),
  reasonCode: text('reason_code').notNull(),
  reasonToAuthor: text('reason_to_author'),
  policyVersion: text('policy_version'),
  actorAccountId: uuid('actor_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  // `{state_before, state_after}` — append-only, never edits narrative
  // (02-data-model.md §9).
  publicEffect: jsonb('public_effect').$type<{ stateBefore: string; stateAfter: string }>().notNull(),
  createdAt: createdAt(),
});

export const appeals = pgTable('appeals', {
  id: id(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => moderationCases.id, { onDelete: 'cascade' }),
  // Private.
  appellantAccountId: uuid('appellant_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  text: text('text').notNull(),
  status: appealStatusEnum('status').notNull(),
  checklist: jsonb('checklist').notNull().default({}),
  decidedBy: uuid('decided_by').references(() => accountProfiles.id),
  decisionReason: text('decision_reason'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});
