// Seed integration test (task step 9's three named assertions). Runs
// against `DATABASE_URL_TEST` (this worktree's isolated
// `rogikotha_test_t007`, per the loop coordinator's assignment).
//
// This file resets and migrates the schema itself — it is deliberately
// **excluded** from the default `pnpm test`/`pnpm check`/`pnpm test:int`
// sweep (see `vitest.config.ts`'s `exclude`) rather than sharing a project
// with `packages/database`'s own int tests, which reset the exact same
// physical test database in their own `beforeAll`: running both in the
// same `vitest` invocation risks two concurrent `DROP SCHEMA public
// CASCADE` calls racing each other. Run this file on its own:
//
//   pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
//
// (passing an explicit file path bypasses this project's `exclude`). See
// the hand-off / ISSUES.md for the full reasoning and the exact command
// used to verify this file for T-007.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createDb, type Db } from '@rogikotha/database';
import { config as loadDotenv } from 'dotenv';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runSeed } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, '..', '..', '..', '..', '.env') });

const migrationsFolder = path.resolve(here, '..', '..', '..', 'database', 'src', 'migrations');
const url = process.env.DATABASE_URL_TEST!;

let db: Db;
let pool: Pool;

async function resetAndMigrate(): Promise<void> {
  const resetPool = new Pool({ connectionString: url });
  try {
    await resetPool.query('DROP SCHEMA public CASCADE');
    await resetPool.query('CREATE SCHEMA public');
    await resetPool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await resetPool.query('CREATE EXTENSION IF NOT EXISTS citext');
    await resetPool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await resetPool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  } finally {
    await resetPool.end();
  }
  const migrator = createDb(url);
  try {
    await migrate(migrator.db, { migrationsFolder, migrationsTable: 'drizzle_migrations', migrationsSchema: 'public' });
  } finally {
    await migrator.pool.end();
  }
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`select count(*)::text as count from ${table}`);
  return Number(result.rows[0]!.count);
}

beforeAll(async () => {
  if (!url) throw new Error('DATABASE_URL_TEST is not set (check .env)');
  await resetAndMigrate();
  const created = createDb(url);
  db = created.db;
  pool = created.pool;
}, 120_000);

afterAll(async () => {
  await pool?.end();
});

describe('seed', () => {
  it('on an empty database inserts the corpus and is idempotent on re-run', async () => {
    const firstCounts = await runSeed(db);
    expect(Object.values(firstCounts).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);

    const doctors = await countRows('doctors');
    const branches = await countRows('facility_branches');
    const terms = await countRows('taxonomy_terms');
    const reviews = await countRows('reviews');
    const facilityReviews = await countRows('facility_reviews');
    const comments = await countRows('comments');
    const evidenceItems = await countRows('evidence_items');
    const cases = await countRows('moderation_cases');
    const accountsCount = await countRows('account_profiles');

    expect(doctors).toBe(6);
    expect(branches).toBe(5);
    expect(terms).toBeGreaterThanOrEqual(8);
    expect(reviews).toBe(12);
    expect(facilityReviews).toBe(8);
    expect(comments).toBe(10);
    expect(evidenceItems).toBe(7);
    expect(cases).toBe(5);
    expect(accountsCount).toBeGreaterThanOrEqual(15);

    // Second run: every step must insert 0 new rows into the tables that
    // carry a natural idempotency key.
    const secondCounts = await runSeed(db);
    const doctorsAfter = await countRows('doctors');
    const reviewsAfter = await countRows('reviews');
    const commentsAfter = await countRows('comments');
    const casesAfter = await countRows('moderation_cases');
    expect(doctorsAfter).toBe(doctors);
    expect(reviewsAfter).toBe(reviews);
    expect(commentsAfter).toBe(comments);
    expect(casesAfter).toBe(cases);
    // The two count objects should agree on every step name (values may
    // legitimately differ — the second run reports 0 for steps that
    // inserted nothing further — but no step should be missing).
    expect(Object.keys(secondCounts).sort()).toEqual(Object.keys(firstCounts).sort());
  }, 180_000);

  it('sentiment distribution for d1 counts only published reviews', async () => {
    const result = await pool.query<{ sentiment: string; n: string }>(`
      select r.sentiment, count(*)::text as n
      from reviews r
      join doctors d on d.id = r.doctor_id
      where d.seed_ref = 'd1' and r.state = 'published'
      group by r.sentiment
    `);
    const bySentiment = Object.fromEntries(result.rows.map((row) => [row.sentiment, Number(row.n)]));
    // d1 has five reviews in the corpus (r1..r5); r4 is hidden_pending_review
    // (seed-moderation.ts, MOD-2011's appeal), so only four are published:
    // r1 positive, r2 mixed, r3 positive, r5 positive.
    expect(bySentiment.positive).toBe(3);
    expect(bySentiment.mixed).toBe(1);
    expect(bySentiment.negative ?? 0).toBe(0);

    const hiddenCount = await pool.query<{ n: string }>(`
      select count(*)::text as n
      from reviews r
      join doctors d on d.id = r.doctor_id
      where d.seed_ref = 'd1' and r.state != 'published'
    `);
    expect(Number(hiddenCount.rows[0]!.n)).toBe(1); // r4
  });

  it('facility_reviews never reference doctors', async () => {
    const result = await pool.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'facility_reviews' and column_name ilike '%doctor%'
    `);
    expect(result.rows).toHaveLength(0);
  });
});
