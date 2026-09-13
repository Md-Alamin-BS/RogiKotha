// Task step 14: append-only enforcement (02-data-model.md §10).
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import {
  accountProfiles,
  authUsers,
  auditEvents,
  doctors,
  evidenceCustodyEvents,
  evidenceItems,
  personas,
  reviews,
} from './schema/index.js';
import { testDb } from './test-setup.js';

/**
 * drizzle-orm 0.45 wraps the driver error: `error.message` is a generic
 * "Failed query: ..." string and the real PostgreSQL message (what the
 * trigger/constraint actually raised) lives on `error.cause.message`
 * instead. Asserts on the cause so these tests catch the real reason a
 * write failed, not just that it failed for some reason.
 */
async function expectPgError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(promise).rejects.toSatisfy((err: unknown) => {
    const cause = err instanceof Error ? err.cause : undefined;
    const message = cause instanceof Error ? cause.message : undefined;
    return typeof message === 'string' && pattern.test(message);
  });
}

/** Minimal fixture chain (auth user -> account -> persona -> doctor -> review -> evidence item) for this file's tests only. */
async function insertEvidenceItem() {
  const [authUser] = await testDb
    .insert(authUsers)
    .values({ id: crypto.randomUUID(), email: `append-only-${crypto.randomUUID()}@example.test` })
    .returning();
  const [account] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId: authUser!.id,
      username: `u${crypto.randomUUID().slice(0, 8)}`,
      usernameKey: 'u',
      displayName: 'Test',
      locale: 'en',
    })
    .returning();
  const [persona] = await testDb
    .insert(personas)
    .values({ kind: 'named', displayName: 'Test' })
    .returning();
  const [doctor] = await testDb
    .insert(doctors)
    .values({ publicId: `d${crypto.randomUUID().slice(0, 8)}`, nameEn: 'A', nameBn: 'B', state: 'published', nameKey: 'a' })
    .returning();
  const [review] = await testDb
    .insert(reviews)
    .values({
      publicId: `r${crypto.randomUUID().slice(0, 8)}`,
      authorPersonaId: persona!.id,
      doctorId: doctor!.id,
      kind: 'quick',
      relationship: 'self',
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 1,
      title: 't',
      language: 'en',
      state: 'published',
      version: 1,
    })
    .returning();
  const [item] = await testDb
    .insert(evidenceItems)
    .values({
      publicId: `e${crypto.randomUUID().slice(0, 8)}`,
      reviewId: review!.id,
      group: 'reviewed',
      state: 'preview_ready',
      declaredMime: 'image/jpeg',
      originalBytes: 100,
      originalSha256: 'x',
      originalFilenameEnc: Buffer.from('name'),
      uploadedByAccountId: account!.id,
    })
    .returning();
  return item!;
}

/** `DATABASE_URL_TEST` with its credentials swapped for `rk_maintenance`'s — mirrors `test-setup.ts`'s `workerUrlForTestDb()`. */
function maintenanceUrlForTestDb(): string {
  const u = new URL(process.env.DATABASE_URL_TEST!);
  u.username = 'rk_maintenance';
  u.password = 'rk_maintenance';
  return u.toString();
}

describe('append-only enforcement', () => {
  it('updating an audit event raises append_only_violation', async () => {
    const [row] = await testDb
      .insert(auditEvents)
      .values({ stream: 'account:append-only-test', action: 'test_action', actor: 'system:test', details: {} })
      .returning();
    await expectPgError(
      testDb.update(auditEvents).set({ action: 'changed' }).where(sql`${auditEvents.id} = ${row!.id}`),
      /append_only_violation/i,
    );
  });

  it('deleting a custody event raises append_only_violation', async () => {
    const item = await insertEvidenceItem();
    const [event] = await testDb
      .insert(evidenceCustodyEvents)
      .values({ itemId: item.id, event: 'received', actor: 'system:test', details: {} })
      .returning();
    await expectPgError(
      testDb.delete(evidenceCustodyEvents).where(sql`${evidenceCustodyEvents.id} = ${event!.id}`),
      /append_only_violation/i,
    );
  });

  it('fn_expire_audit deletes old rows when called as rk_maintenance', async () => {
    await testDb.insert(auditEvents).values({
      stream: 'account:expire-test',
      action: 'test_action',
      actor: 'system:test',
      details: {},
    });
    const before = await testDb.execute<{ count: string }>(
      sql`select count(*)::text as count from ${auditEvents} where stream = 'account:expire-test'`,
    );
    expect(before.rows[0]?.count).toBe('1');

    const pool = new Pool({ connectionString: maintenanceUrlForTestDb() });
    try {
      await pool.query("select fn_expire_audit(now() + interval '1 minute')");
    } finally {
      await pool.end();
    }

    const after = await testDb.execute<{ count: string }>(
      sql`select count(*)::text as count from ${auditEvents} where stream = 'account:expire-test'`,
    );
    expect(after.rows[0]?.count).toBe('0');
  });
});
