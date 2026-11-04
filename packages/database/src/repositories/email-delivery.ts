// The `EmailDeliveryRepository` port (T-101 BR6.1, BR6.3, BR6.8): the email-delivery side of the
// notification module, used by `queueEmail` in the web tier and by `sendEmailDelivery` in the
// worker. Its own class, because the port's `insert` would clash with the in-app notification
// stub `PgNotificationRepository.insert` (T-405).
import type {
  EmailDeliveryErrorCode,
  EmailDeliveryRecord,
  EmailDeliveryRepository,
  EmailMessageKey,
  EmailParams,
  NewEmailDelivery,
  Tx as AppTx,
} from '@rogikotha/application';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { emailDeliveries } from '../schema/notification';
import { executorOf } from '../unit-of-work';

type EmailDeliveryRow = typeof emailDeliveries.$inferSelect;

function toRecord(row: EmailDeliveryRow): EmailDeliveryRecord {
  return {
    id: row.id,
    accountId: row.accountId,
    toEmailEnc: new Uint8Array(row.toEmailEnc),
    locale: row.locale,
    // ASSUMPTION(T-101): the column holds only the T-101 categories and keys until T-405 widens
    // the port; the worker refuses an unknown key as `template_missing`.
    category: row.category as EmailDeliveryRecord['category'],
    messageKey: row.messageKey as EmailMessageKey,
    params: row.params as EmailParams,
    dedupeKey: row.dedupeKey,
    status: row.status,
    attempts: row.attempts,
    lastErrorCode: row.lastErrorCode as EmailDeliveryErrorCode | null,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  };
}

export class PgEmailDeliveryRepository implements EmailDeliveryRepository {
  async insert(tx: AppTx, row: NewEmailDelivery): Promise<void> {
    await executorOf(tx)
      .insert(emailDeliveries)
      .values({
        id: row.id,
        accountId: row.accountId,
        toEmailEnc: Buffer.from(row.toEmailEnc),
        locale: row.locale,
        category: row.category,
        messageKey: row.messageKey,
        params: row.params,
        dedupeKey: row.dedupeKey,
      });
  }

  async findById(tx: AppTx, id: string): Promise<EmailDeliveryRecord | null> {
    const [row] = await executorOf(tx)
      .select()
      .from(emailDeliveries)
      .where(eq(emailDeliveries.id, id))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async findByDedupeKey(tx: AppTx, dedupeKey: string): Promise<{ id: string } | null> {
    const [row] = await executorOf(tx)
      .select({ id: emailDeliveries.id })
      .from(emailDeliveries)
      .where(eq(emailDeliveries.dedupeKey, dedupeKey))
      .limit(1);
    return row ?? null;
  }

  async findRecent(
    tx: AppTx,
    query: { accountId: string; messageKey: EmailMessageKey; since: Date },
  ): Promise<{ id: string; createdAt: Date } | null> {
    const [row] = await executorOf(tx)
      .select({ id: emailDeliveries.id, createdAt: emailDeliveries.createdAt })
      .from(emailDeliveries)
      .where(
        and(
          eq(emailDeliveries.accountId, query.accountId),
          eq(emailDeliveries.messageKey, query.messageKey),
          gte(emailDeliveries.createdAt, query.since),
        ),
      )
      .orderBy(desc(emailDeliveries.createdAt))
      .limit(1);
    return row ?? null;
  }

  async recordAttempt(
    tx: AppTx,
    id: string,
    errorCode: EmailDeliveryErrorCode,
  ): Promise<{ attempts: number }> {
    const [row] = await executorOf(tx)
      .update(emailDeliveries)
      .set({ attempts: sql`${emailDeliveries.attempts} + 1`, lastErrorCode: errorCode })
      .where(eq(emailDeliveries.id, id))
      .returning({ attempts: emailDeliveries.attempts });
    // The worker only records attempts for a delivery it has just read.
    if (!row) throw new Error(`email delivery ${id} not found`);
    return row;
  }

  async markSent(tx: AppTx, id: string, sentAt: Date): Promise<void> {
    await executorOf(tx)
      .update(emailDeliveries)
      .set({
        status: 'sent',
        sentAt,
        attempts: sql`${emailDeliveries.attempts} + 1`,
        // BR6.8: the link is gone once the delivery is final.
        params: {},
      })
      .where(eq(emailDeliveries.id, id));
  }

  async markFailed(tx: AppTx, id: string, errorCode: EmailDeliveryErrorCode): Promise<void> {
    await executorOf(tx)
      .update(emailDeliveries)
      .set({ status: 'failed', lastErrorCode: errorCode, params: {} })
      .where(eq(emailDeliveries.id, id));
  }
}
