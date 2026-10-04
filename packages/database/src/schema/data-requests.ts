// Data requests and deletion (02-data-model.md §14, AD-17).
import type { DeletionAction } from '@rogikotha/contracts';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account.js';
import { createdAt, id } from './_common.js';
import { dataRequestKindEnum, dataRequestStatusEnum } from './enums.js';

export interface DataRequestPlanStep {
  module: string;
  action: DeletionAction;
  targetIds: string[];
  status: 'pending' | 'done' | 'failed';
  errorCode?: string;
}

export const dataRequests = pgTable('data_requests', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accountProfiles.id, { onDelete: 'cascade' }),
  kind: dataRequestKindEnum('kind').notNull(),
  status: dataRequestStatusEnum('status').notNull(),
  plan: jsonb('plan').$type<DataRequestPlanStep[]>().notNull().default([]),
  // Export zip — private (02-data-model.md §14).
  resultStorageKey: text('result_storage_key'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  // Export download window: 7 days.
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: createdAt(),
});
