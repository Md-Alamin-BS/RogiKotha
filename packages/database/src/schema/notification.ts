// Notifications (02-data-model.md §12).
import { sql } from 'drizzle-orm';
import { check, customType, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account.js';
import { createdAt, id } from './_common.js';
import { localeEnum, notificationKindEnum, staffNotificationKindEnum } from './enums.js';

/**
 * `bytea` — duplicated from `review.ts` (see that file's comment); `_common.ts`
 * is outside this task's owned "Modify" list.
 */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

const EMAIL_CATEGORIES = [
  'verification',
  'reset',
  'security',
  'moderation',
  'evidence',
  'device_approval',
  'deletion',
] as const;

const EMAIL_STATUSES = ['queued', 'sent', 'failed', 'suppressed'] as const;

export const notifications = pgTable('notifications', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  kind: notificationKindEnum('kind').notNull(),
  messageKey: text('message_key').notNull(),
  // Ids, counts only — never content (01-conventions.md §5/§11).
  params: jsonb('params').notNull().default({}),
  route: text('route').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  dedupeKey: text('dedupe_key').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '90 days'`),
  createdAt: createdAt(),
});

export const staffNotifications = pgTable('staff_notifications', {
  id: id(),
  kind: staffNotificationKindEnum('kind').notNull(),
  targetCode: text('target_code'),
  messageKey: text('message_key').notNull(),
  params: jsonb('params').notNull().default({}),
  route: text('route').notNull(),
  ackedBy: uuid('acked_by').references(() => accountProfiles.id),
  ackedAt: timestamp('acked_at', { withTimezone: true }),
  dedupeKey: text('dedupe_key').notNull().unique(),
  createdAt: createdAt(),
});

export const emailDeliveries = pgTable(
  'email_deliveries',
  {
    id: id(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    // Written by the web tier so the worker never reads `auth_users`
    // (02-data-model.md §12/§16).
    toEmailEnc: bytea('to_email_enc').notNull(),
    locale: localeEnum('locale').notNull(),
    // ASSUMPTION(T-005): `category`/`status` are literal unions in
    // 02-data-model.md §12's table cell text, not top-level enums; local
    // literal unions plus the CHECK constraints below avoid both widening
    // `schema/enums.ts` (outside this task's owned paths) and the
    // TS-only-enum gap `ISS-110` found.
    category: text('category', { enum: EMAIL_CATEGORIES }).notNull(),
    messageKey: text('message_key').notNull(),
    params: jsonb('params').notNull().default({}),
    status: text('status', { enum: EMAIL_STATUSES }).notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    lastErrorCode: text('last_error_code'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'email_deliveries_category_check',
      sql`${t.category} in ('verification', 'reset', 'security', 'moderation', 'evidence', 'device_approval', 'deletion')`,
    ),
    check('email_deliveries_status_check', sql`${t.status} in ('queued', 'sent', 'failed', 'suppressed')`),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: id(),
    // Past tense, e.g. `review.published` (02-data-model.md §12).
    name: text('name').notNull(),
    payload: jsonb('payload').notNull().default({}),
    createdAt: createdAt(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [index('outbox_events_processed_at_created_at_idx').on(t.processedAt.asc().nullsFirst(), t.createdAt.asc())],
);
