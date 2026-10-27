// Evidence retention, holds, custody (02-data-model.md §7 second half).
import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id } from './_common';
import { targetKindEnum } from './enums';

export const legalHolds = pgTable('legal_holds', {
  id: id(),
  // Reuses the shared `target_kind` enum (review|facility_review|comment|
  // evidence|profile) — a hold can target any of those, matching the
  // command catalogue's `hold.place` (`{targetKind, targetId, …}`).
  targetKind: targetKindEnum('target_kind').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  placedByAccountId: uuid('placed_by_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  releasedBy: uuid('released_by').references(() => accountProfiles.id),
  createdAt: createdAt(),
});

export const retentionPolicies = pgTable('retention_policies', {
  id: id(),
  version: integer('version').notNull().unique(),
  originalDays: integer('original_days').notNull().default(90),
  auditDays: integer('audit_days').notNull().default(180),
  notificationDays: integer('notification_days').notNull().default(90),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  actorAccountId: uuid('actor_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  reason: text('reason').notNull(),
  supersededBy: integer('superseded_by'),
  createdAt: createdAt(),
});

export const retentionBulkActions = pgTable('retention_bulk_actions', {
  id: id(),
  policyVersion: integer('policy_version').notNull(),
  // `{count, sample_ids, from_days, to_days}` (02-data-model.md §7).
  preview: jsonb('preview').$type<{ count: number; sampleIds: string[]; fromDays: number; toDays: number }>().notNull(),
  previewedAt: timestamp('previewed_at', { withTimezone: true }).notNull().defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  actorAccountId: uuid('actor_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  reason: text('reason').notNull(),
  affectedIds: jsonb('affected_ids').$type<string[]>(),
  driftDetected: boolean('drift_detected').notNull().default(false),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: createdAt(),
});
