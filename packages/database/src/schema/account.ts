// Accounts and staff (02-data-model.md §2).
import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { authUsers } from './auth.js';
import { citext, createdAt, id, timestamps } from './_common.js';
import { accountStatusEnum, enforcementKindEnum, localeEnum, staffRoleEnum } from './enums.js';

export const accountProfiles = pgTable('account_profiles', {
  id: id(),
  authUserId: text('auth_user_id')
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  // 3-24 chars, `[a-z0-9_]`, enforced by the `directory.registerUsername`
  // command's zod schema in `@rogikotha/contracts`, not a db constraint.
  username: citext('username').notNull().unique(),
  usernameKey: text('username_key').notNull(),
  displayName: text('display_name').notNull(),
  locale: localeEnum('locale').notNull(),
  status: accountStatusEnum('status').notNull().default('pending_verification'),
  staffRole: staffRoleEnum('staff_role'),
  ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }),
  termsVersion: text('terms_version'),
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps(),
});

export const accountPreferences = pgTable('account_preferences', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  interfaceLocale: localeEnum('interface_locale').notNull(),
  emailSecurity: boolean('email_security').notNull().default(true),
  emailModeration: boolean('email_moderation').notNull().default(true),
  emailEvidence: boolean('email_evidence').notNull().default(true),
  emailDiscussion: boolean('email_discussion').notNull().default(false),
  ...timestamps(),
});

export const staffDevices = pgTable('staff_devices', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  // Hash of the `rk_staff_device` cookie secret — the secret itself never
  // reaches the database (02-data-model.md §2).
  deviceHash: text('device_hash').notNull(),
  label: text('label').notNull(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  // ISS-111 item (2): every table has `created_at` per 02-data-model.md's
  // header rule; missing here since T-004.
  createdAt: createdAt(),
});

export const staffDeviceApprovals = pgTable('staff_device_approvals', {
  id: id(),
  deviceId: uuid('device_id')
    .notNull()
    .references(() => staffDevices.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const enforcements = pgTable('enforcements', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  kind: enforcementKindEnum('kind').notNull(),
  reasonCode: text('reason_code').notNull(),
  noteToUser: text('note_to_user'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  // `moderation_decisions` now exists (T-005, `schema/moderation.ts`), but
  // `moderation.ts` itself references `accountProfiles` (`actorAccountId`
  // etc.), so a Drizzle `.references()` here would be a circular import
  // between the two schema files. Left a plain `uuid` column; the real FK
  // constraint is added by raw SQL in `0005_deferred_fks.sql` instead.
  decisionId: uuid('decision_id'),
  actorAccountId: uuid('actor_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  createdAt: createdAt(),
});

export const feedback = pgTable('feedback', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  locale: localeEnum('locale').notNull(),
  createdAt: createdAt(),
});

export const bookmarks = pgTable(
  'bookmarks',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    // `reviews` now exists (T-005, `schema/review.ts`). Kept a plain `uuid`
    // column for consistency with the other three deferred FKs added via
    // raw SQL (`persona_links.review_id`, `enforcements.decision_id`,
    // `evidence_items.published_artifact_id`) — the real FK constraint is
    // added by raw SQL in `0005_deferred_fks.sql` (`evidence_items.hold_id`,
    // the fifth deferred FK, is a normal Drizzle `.references()` in
    // `schema/evidence.ts` instead, since it has no circular import to
    // avoid).
    reviewId: uuid('review_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.reviewId] })],
);

export const blocks = pgTable(
  'blocks',
  {
    blockerAccountId: uuid('blocker_account_id')
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    blockedAccountId: uuid('blocked_account_id')
      .notNull()
      .references(() => accountProfiles.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerAccountId, t.blockedAccountId] })],
);
