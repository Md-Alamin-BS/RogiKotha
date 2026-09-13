// Task step 14: constraint/trigger tests, plus the FD-037 (ISS-107)
// default-deny proof this task's coordinating session required: `rk_worker`
// is denied by default on a table it has no explicit grant for, and
// specifically on `reports.reporter_account_id`- and
// `appeals.appellant_account_id`-bearing access paths (02-data-model.md
// §16, hard rule #8).
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import {
  accountProfiles,
  authUsers,
  comments,
  doctors,
  evidenceArtifacts,
  evidenceItems,
  personas,
  reports,
  reviews,
  reviewTags,
} from './schema/index.js';
import { testDb, workerUrlForTestDb } from './test-setup.js';

/**
 * drizzle-orm 0.45 wraps the driver error: `error.message` is a generic
 * "Failed query: ..." string and the real PostgreSQL message (what the
 * check constraint/trigger/unique index actually raised) lives on
 * `error.cause.message` instead. Only needed for `testDb.*` calls below —
 * the raw `pg` `Pool` calls in the FD-037 tests further down are not
 * drizzle-wrapped and their `.message` already contains the real reason.
 */
async function expectPgError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(promise).rejects.toSatisfy((err: unknown) => {
    const cause = err instanceof Error ? err.cause : undefined;
    const message = cause instanceof Error ? cause.message : undefined;
    return typeof message === 'string' && pattern.test(message);
  });
}

async function insertAccount() {
  const [authUser] = await testDb
    .insert(authUsers)
    .values({ id: crypto.randomUUID(), email: `constraints-${crypto.randomUUID()}@example.test` })
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
  return account!;
}

async function insertReview() {
  const [persona] = await testDb.insert(personas).values({ kind: 'named', displayName: 'Test' }).returning();
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
  return { review: review!, persona: persona! };
}

async function insertEvidenceItem(reviewId: string, accountId: string) {
  const [item] = await testDb
    .insert(evidenceItems)
    .values({
      publicId: `e${crypto.randomUUID().slice(0, 8)}`,
      reviewId,
      group: 'reviewed',
      state: 'published',
      declaredMime: 'image/jpeg',
      originalBytes: 100,
      originalSha256: 'x',
      originalFilenameEnc: Buffer.from('name'),
      uploadedByAccountId: accountId,
    })
    .returning();
  return item!;
}

describe('database-level constraints and triggers', () => {
  it('has 59 tables in public schema (30 from T-004 + 28 from T-005 + drizzle_migrations; acceptance-check table)', async () => {
    // The task file's acceptance table says "48 (24 from T-004 + 24 here;
    // adjust and record the exact number)" — both halves of that estimate
    // were already wrong (T-004 is actually 30, ISS-086), and this task
    // creates 28, not 24. `pg_tables` also counts `drizzle_migrations`
    // itself (moved into `public` by T-004's ISS-092 fix), so the true
    // total is 30 + 28 + 1 = 59, not 58.
    const rows = await testDb.execute<{ count: string }>(
      sql`select count(*)::text as count from pg_tables where schemaname = 'public'`,
    );
    expect(rows.rows[0]?.count).toBe('59');
  });

  it('facility_reviews has no doctor_id column (hard rule: facility feedback never touches a doctor aggregate)', async () => {
    const rows = await testDb.execute<{ column_name: string }>(sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'facility_reviews'
    `);
    const names = rows.rows.map((r) => r.column_name);
    expect(names).not.toContain('doctor_id');
    expect(names).toContain('branch_id');
  });

  it('no table in this task has a rating/score column (hard rule: no number stands for quality)', async () => {
    const rows = await testDb.execute<{ table_name: string; column_name: string }>(sql`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public'
        and table_name in (
          'reviews', 'review_tags', 'review_versions', 'review_follow_ups', 'review_drafts', 'facility_reviews',
          'evidence_items', 'evidence_artifacts', 'evidence_redactions', 'evidence_custody_events',
          'legal_holds', 'retention_policies', 'retention_bulk_actions',
          'comments', 'comment_mentions', 'reactions',
          'reports', 'moderation_cases', 'moderation_case_reasons', 'moderation_decisions', 'appeals',
          'notifications', 'staff_notifications', 'email_deliveries', 'outbox_events',
          'search_documents', 'search_aliases',
          'data_requests'
        )
        and (column_name ilike '%rating%' or column_name ilike '%score%')
    `);
    expect(rows.rows).toEqual([]);
  });

  it('a public original artifact is rejected by the check constraint', async () => {
    const account = await insertAccount();
    const { review } = await insertReview();
    const item = await insertEvidenceItem(review.id, account.id);
    await expectPgError(
      testDb.insert(evidenceArtifacts).values({
        itemId: item.id,
        kind: 'original',
        storageKey: `k${crypto.randomUUID()}`,
        sha256: 'x',
        bytes: 10,
        mime: 'image/jpeg',
        public: true,
      }),
      /evidence_artifacts_original_not_public_check/i,
    );
  });

  it('a reply to a reply is rejected by the depth trigger', async () => {
    const { review, persona } = await insertReview();
    const [top] = await testDb
      .insert(comments)
      .values({
        publicId: `c${crypto.randomUUID().slice(0, 8)}`,
        reviewId: review.id,
        authorPersonaId: persona.id,
        body: 'top',
        state: 'published',
      })
      .returning();
    const [reply] = await testDb
      .insert(comments)
      .values({
        publicId: `c${crypto.randomUUID().slice(0, 8)}`,
        reviewId: review.id,
        parentId: top!.id,
        authorPersonaId: persona.id,
        body: 'reply',
        state: 'published',
      })
      .returning();
    await expectPgError(
      testDb.insert(comments).values({
        publicId: `c${crypto.randomUUID().slice(0, 8)}`,
        reviewId: review.id,
        parentId: reply!.id,
        authorPersonaId: persona.id,
        body: 'reply-to-reply',
        state: 'published',
      }),
      /community\.reply_depth/i,
    );
  });

  it('a second report by the same account on the same target violates the unique constraint', async () => {
    const account = await insertAccount();
    const { review } = await insertReview();
    await testDb.insert(reports).values({
      targetKind: 'review',
      targetId: review.id,
      reviewId: review.id,
      reporterAccountId: account.id,
      reason: 'spam',
    });
    await expectPgError(
      testDb.insert(reports).values({
        targetKind: 'review',
        targetId: review.id,
        reviewId: review.id,
        reporterAccountId: account.id,
        reason: 'factual',
      }),
      /reports_target_reporter_unique/i,
    );
  });

  it('a review tag must have exactly one of term/free_text/not_sure', async () => {
    const { review } = await insertReview();
    // None of the three set.
    await expectPgError(
      testDb.insert(reviewTags).values({ reviewId: review.id, group: 'symptom', notSure: false }),
      /review_tags_one_of_term_free_text_not_sure/i,
    );

    // Two of the three set (free_text and not_sure both).
    await expectPgError(
      testDb.insert(reviewTags).values({ reviewId: review.id, group: 'symptom', freeText: 'fever', notSure: true }),
      /review_tags_one_of_term_free_text_not_sure/i,
    );

    // Exactly one set — succeeds.
    const [tag] = await testDb
      .insert(reviewTags)
      .values({ reviewId: review.id, group: 'symptom', freeText: 'fever', notSure: false })
      .returning();
    expect(tag?.freeText).toBe('fever');
  });

  describe('FD-037 (ISS-107): rk_worker default-deny', () => {
    it('is denied by default on a table it has no explicit grant for', async () => {
      const pool = new Pool({ connectionString: workerUrlForTestDb() });
      try {
        // review_tags carries no rk_worker grant in 0005_grants_part2.sql —
        // proves the flipped default, not just a specific hand-picked table.
        await expect(pool.query('select * from review_tags limit 1')).rejects.toThrow(/permission denied/i);
      } finally {
        await pool.end();
      }
    });

    it('is denied on reports.reporter_account_id even though other reports columns are readable', async () => {
      const pool = new Pool({ connectionString: workerUrlForTestDb() });
      try {
        await expect(pool.query('select reporter_account_id from reports')).rejects.toThrow(/permission denied/i);
        // The column-level allowlist still works for the rest of the row.
        await expect(pool.query('select id, reason from reports')).resolves.toBeDefined();
      } finally {
        await pool.end();
      }
    });

    it('is denied on appeals entirely, including appellant_account_id', async () => {
      const pool = new Pool({ connectionString: workerUrlForTestDb() });
      try {
        await expect(pool.query('select appellant_account_id from appeals')).rejects.toThrow(/permission denied/i);
        await expect(pool.query('select id from appeals')).rejects.toThrow(/permission denied/i);
      } finally {
        await pool.end();
      }
    });

    it('is denied on moderation_cases (no allowlist entry) even though it references target content', async () => {
      const pool = new Pool({ connectionString: workerUrlForTestDb() });
      try {
        await expect(pool.query('select code from moderation_cases limit 1')).rejects.toThrow(/permission denied/i);
      } finally {
        await pool.end();
      }
    });

    it('is denied on a table rk_app creates after this migration (the flipped default itself, not a leftover grant)', async () => {
      await testDb.execute(sql`create table if not exists fd037_future_probe (id uuid primary key default uuidv7())`);
      const pool = new Pool({ connectionString: workerUrlForTestDb() });
      try {
        await expect(pool.query('select * from fd037_future_probe limit 1')).rejects.toThrow(/permission denied/i);
      } finally {
        await pool.end();
        await testDb.execute(sql`drop table if exists fd037_future_probe`);
      }
    });
  });
});
