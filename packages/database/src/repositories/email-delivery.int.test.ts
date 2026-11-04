// PgEmailDeliveryRepository against DATABASE_URL_TEST (T-101 BR6.1, BR6.3, BR6.8).
import type { NewEmailDelivery } from '@rogikotha/application';
import { newId } from '@rogikotha/contracts';
import { eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { emailDeliveries } from '../schema/notification';
import { testDb, workerUrlForTestDb } from '../test-setup';
import { appTx, buildAccount, uniqueSuffix } from './account-test-support';
import { PgEmailDeliveryRepository } from './email-delivery';

const repo = new PgEmailDeliveryRepository();
const tx = appTx(testDb);

async function buildDelivery(overrides: Partial<NewEmailDelivery> = {}): Promise<NewEmailDelivery> {
  const accountId = overrides.accountId ?? (await buildAccount(testDb)).accountId;
  const delivery: NewEmailDelivery = {
    id: newId(),
    accountId,
    toEmailEnc: new Uint8Array([1, 2, 3, 4, 5]),
    locale: 'bn',
    category: 'verification',
    messageKey: 'email.verify',
    params: { link: 'http://localhost:3000/bn/verify?token=synthetic' },
    dedupeKey: null,
    ...overrides,
  };
  await repo.insert(tx, delivery);
  return delivery;
}

describe('PgEmailDeliveryRepository insert and reads', () => {
  it('stores a queued delivery and reads it back with its ciphertext bytes', async () => {
    const delivery = await buildDelivery({ dedupeKey: `verify:${uniqueSuffix()}` });

    const found = await repo.findById(tx, delivery.id);

    expect(found).toMatchObject({
      ...delivery,
      status: 'queued',
      attempts: 0,
      lastErrorCode: null,
      sentAt: null,
    });
    expect(found?.toEmailEnc).toBeInstanceOf(Uint8Array);
    expect([...(found?.toEmailEnc ?? [])]).toEqual([1, 2, 3, 4, 5]);
    expect(found?.createdAt).toBeInstanceOf(Date);
  });

  it('returns null for an unknown delivery id', async () => {
    expect(await repo.findById(tx, newId())).toBeNull();
  });

  it('finds a delivery by its dedupe key, and nothing for an unused key', async () => {
    const dedupeKey = `reset:${uniqueSuffix()}`;
    const delivery = await buildDelivery({ dedupeKey });

    expect(await repo.findByDedupeKey(tx, dedupeKey)).toEqual({ id: delivery.id });
    expect(await repo.findByDedupeKey(tx, `reset:${uniqueSuffix()}`)).toBeNull();
  });

  it('refuses a second delivery with the same dedupe key', async () => {
    const dedupeKey = `security:${uniqueSuffix()}`;
    const first = await buildDelivery({ dedupeKey });

    await expect(buildDelivery({ accountId: first.accountId, dedupeKey })).rejects.toThrow();
  });

  it('allows any number of deliveries without a dedupe key', async () => {
    const first = await buildDelivery();
    await buildDelivery({ accountId: first.accountId });

    const rows = await testDb
      .select({ id: emailDeliveries.id })
      .from(emailDeliveries)
      .where(eq(emailDeliveries.accountId, first.accountId));
    expect(rows).toHaveLength(2);
  });
});

describe('PgEmailDeliveryRepository.findRecent (the once-per-window check, BR3.9)', () => {
  it('returns the newest delivery of the key to the account created at or after since', async () => {
    const older = await buildDelivery({
      category: 'security',
      messageKey: 'email.security.severeSignInActivity',
    });
    const newer = await buildDelivery({
      accountId: older.accountId,
      category: 'security',
      messageKey: 'email.security.severeSignInActivity',
    });
    await testDb.execute(
      sql`update email_deliveries set created_at = now() - interval '10 minutes' where id = ${older.id}`,
    );

    const found = await repo.findRecent(tx, {
      accountId: older.accountId,
      messageKey: 'email.security.severeSignInActivity',
      since: new Date(Date.now() - 60 * 60 * 1000),
    });

    expect(found?.id).toBe(newer.id);
    expect(found?.createdAt).toBeInstanceOf(Date);
  });

  it('ignores deliveries before since, of another key or to another account', async () => {
    const old = await buildDelivery({
      category: 'security',
      messageKey: 'email.security.severeSignInActivity',
    });
    await testDb.execute(
      sql`update email_deliveries set created_at = now() - interval '2 hours' where id = ${old.id}`,
    );
    await buildDelivery({ accountId: old.accountId, messageKey: 'email.verify' });
    await buildDelivery({
      category: 'security',
      messageKey: 'email.security.severeSignInActivity',
    });

    expect(
      await repo.findRecent(tx, {
        accountId: old.accountId,
        messageKey: 'email.security.severeSignInActivity',
        since: new Date(Date.now() - 60 * 60 * 1000),
      }),
    ).toBeNull();
  });
});

describe('PgEmailDeliveryRepository status changes', () => {
  it('records a failed attempt, keeps the delivery queued and returns the new count', async () => {
    const delivery = await buildDelivery();

    expect(await repo.recordAttempt(tx, delivery.id, 'smtp_unavailable')).toEqual({ attempts: 1 });
    expect(await repo.recordAttempt(tx, delivery.id, 'smtp_timeout')).toEqual({ attempts: 2 });

    expect(await repo.findById(tx, delivery.id)).toMatchObject({
      status: 'queued',
      attempts: 2,
      lastErrorCode: 'smtp_timeout',
      params: delivery.params,
    });
  });

  it('throws when recording an attempt for a delivery that does not exist', async () => {
    await expect(repo.recordAttempt(tx, newId(), 'smtp_unavailable')).rejects.toThrow(/not found/);
  });

  it('marks a delivery sent, counts the attempt and clears the link (BR6.8)', async () => {
    const delivery = await buildDelivery();
    const sentAt = new Date('2026-11-04T10:00:00.000Z');

    await repo.markSent(tx, delivery.id, sentAt);

    expect(await repo.findById(tx, delivery.id)).toMatchObject({
      status: 'sent',
      sentAt,
      attempts: 1,
      params: {},
    });
  });

  it('marks a delivery failed with its code and clears the link (BR6.8)', async () => {
    const delivery = await buildDelivery();
    await repo.recordAttempt(tx, delivery.id, 'smtp_unavailable');

    await repo.markFailed(tx, delivery.id, 'decrypt_failed');

    expect(await repo.findById(tx, delivery.id)).toMatchObject({
      status: 'failed',
      lastErrorCode: 'decrypt_failed',
      attempts: 1,
      params: {},
      sentAt: null,
    });
  });
});

describe('PgEmailDeliveryRepository as rk_worker', () => {
  it('reads and updates a delivery under the worker role, new dedupe_key column included', async () => {
    const delivery = await buildDelivery({ dedupeKey: `verify:${uniqueSuffix()}` });
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      const { rows } = await pool.query<{ dedupe_key: string }>(
        'select dedupe_key from email_deliveries where id = $1',
        [delivery.id],
      );
      expect(rows).toEqual([{ dedupe_key: delivery.dedupeKey }]);
      await expect(
        pool.query(`update email_deliveries set status = 'sent', params = '{}' where id = $1`, [
          delivery.id,
        ]),
      ).resolves.toMatchObject({ rowCount: 1 });
    } finally {
      await pool.end();
    }
  });
});
