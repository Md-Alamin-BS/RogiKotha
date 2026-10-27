// Administration (02-data-model.md §11, AD-10).
import type { ConfigValues } from '@rogikotha/contracts';
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id } from './_common';

export const configVersions = pgTable('config_versions', {
  id: id(),
  version: integer('version').notNull().unique(),
  schemaVersion: integer('schema_version').notNull(),
  values: jsonb('values').$type<ConfigValues>().notNull(),
  actorAccountId: uuid('actor_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  reason: text('reason').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  rolledBackFrom: integer('rolled_back_from'),
  createdAt: createdAt(),
});

export const configChanges = pgTable('config_changes', {
  id: id(),
  version: integer('version').notNull(),
  path: text('path').notNull(),
  before: jsonb('before'),
  after: jsonb('after').notNull(),
  createdAt: createdAt(),
});
