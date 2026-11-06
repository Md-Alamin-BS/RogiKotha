// Seed integration test (task step 9's three named assertions). Runs
// against `DATABASE_URL_TEST`.
//
// This file resets and migrates the schema itself, so it never shares a run
// slot with `packages/database`'s own int tests, which use the same physical
// test database. In the root runs (`pnpm test`, `pnpm test:coverage`,
// `pnpm check`) it is the `test-support-seed` project of `vitest.workspace.ts`,
// which runs after the `database` project has ended (T-010). It is excluded
// from the plain `test-support` project and can be run on its own:
//
//   pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  appTxOf,
  createDb,
  PgReviewReadRepository,
  PgTaxonomyModuleRepository,
  type Db,
} from '@rogikotha/database';
import { config as loadDotenv } from 'dotenv';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// T-010: the reset `pnpm db:reset` and the database project use (CR-007's lock timeout, both
// schemas dropped together, `pgboss` reinstalled before the migrations). The package exports no
// reset, and a seed test may import database code (FD-040).
import { runReset } from '../../../database/src/reset';
import { ALIASES, BRANCHES, CONDITIONS, MODERATION_CASES, REVIEWS } from '../corpus/index.js';
import { runSeed } from './seed.js';
import { SUGGESTED_CONDITION_SEED_REFS, SUGGESTED_TERMS } from './seed-directory.js';

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, '..', '..', '..', '..', '.env') });

const url = process.env.DATABASE_URL_TEST!;

let db: Db;
let pool: Pool;

async function scalar(sql: string, params: unknown[] = []): Promise<number> {
  const result = await pool.query<{ n: string }>(sql, params);
  return Number(result.rows[0]!.n);
}

/**
 * The seeded collections and their expected row counts, DC1–DC22 of CR-012's
 * functional-spec.md § 6: each equals the prototype's count (FD-089), except
 * user notifications, 9 of 10 because n8 is withheld (FD-086).
 */
const EXPECTED_COUNTS: readonly { id: string; label: string; sql: string; n: number }[] = [
  { id: 'DC1', label: 'doctors', sql: 'select count(*) as n from doctors', n: 10 },
  { id: 'DC2', label: 'organisations', sql: 'select count(*) as n from facilities', n: 7 },
  { id: 'DC3', label: 'branches', sql: 'select count(*) as n from facility_branches', n: 10 },
  {
    id: 'DC4',
    label: 'conditions',
    sql: "select count(*) as n from taxonomy_terms where kind = 'condition'",
    n: 10,
  },
  {
    id: 'DC5',
    label: 'specialties',
    sql: "select count(*) as n from taxonomy_terms where kind = 'specialty'",
    n: 9,
  },
  { id: 'DC6', label: 'aliases', sql: 'select count(*) as n from taxonomy_aliases', n: 33 },
  { id: 'DC7', label: 'chambers', sql: 'select count(*) as n from doctor_chambers', n: 13 },
  { id: 'DC8', label: 'reviews', sql: 'select count(*) as n from reviews', n: 24 },
  {
    id: 'DC9',
    label: 'follow-ups',
    sql: "select count(*) as n from review_follow_ups where kind = 'follow_up'",
    n: 21,
  },
  {
    id: 'DC10',
    label: 'later care',
    sql: "select count(*) as n from review_follow_ups where kind = 'later_care'",
    n: 10,
  },
  {
    id: 'DC11',
    label: 'facility reviews',
    sql: 'select count(*) as n from facility_reviews',
    n: 19,
  },
  { id: 'DC12', label: 'comments', sql: 'select count(*) as n from comments', n: 49 },
  { id: 'DC13', label: 'evidence items', sql: 'select count(*) as n from evidence_items', n: 12 },
  {
    id: 'DC14',
    label: 'moderation cases',
    sql: 'select count(*) as n from moderation_cases',
    n: 10,
  },
  { id: 'DC15', label: 'reports', sql: 'select count(*) as n from reports', n: 17 },
  { id: 'DC16', label: 'appeals', sql: 'select count(*) as n from appeals', n: 2 },
  {
    id: 'DC16',
    label: 'hide decisions',
    sql: "select count(*) as n from moderation_decisions where action = 'hide'",
    n: 2,
  },
  {
    id: 'DC17',
    label: 'case audit rows',
    sql: "select count(*) as n from audit_events where stream like 'case:%'",
    n: 24,
  },
  {
    id: 'DC18',
    label: 'user notifications (n8 withheld, FD-086)',
    sql: 'select count(*) as n from notifications',
    n: 9,
  },
  {
    id: 'DC19',
    label: 'staff notifications',
    sql: 'select count(*) as n from staff_notifications',
    n: 12,
  },
  { id: 'DC20', label: 'drafts', sql: 'select count(*) as n from review_drafts', n: 4 },
  { id: 'DC21', label: 'bookmarks', sql: 'select count(*) as n from bookmarks', n: 8 },
  { id: 'DC22', label: 'submissions', sql: 'select count(*) as n from profile_submissions', n: 8 },
  { id: 'DC22', label: 'claims', sql: 'select count(*) as n from profile_claims', n: 6 },
  {
    id: 'DC22',
    label: 'field changes',
    sql: 'select count(*) as n from profile_field_changes',
    n: 8,
  },
  {
    id: 'derived',
    label: 'accounts (48 corpus + 50 reactors)',
    sql: 'select count(*) as n from account_profiles',
    n: 98,
  },
  { id: 'derived', label: 'personas', sql: 'select count(*) as n from personas', n: 38 },
  { id: 'derived', label: 'reactions', sql: 'select count(*) as n from reactions', n: 683 },
];

async function actualCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const e of EXPECTED_COUNTS) counts[`${e.id} ${e.label}`] = await scalar(e.sql);
  return counts;
}

function expectedCounts(): Record<string, number> {
  return Object.fromEntries(EXPECTED_COUNTS.map((e) => [`${e.id} ${e.label}`, e.n]));
}

/** Per moderation case: report_count, distinct_reporters, reports rows, distinct reporters in rows, and its reason breakdown. */
async function caseFacts(code: string): Promise<{
  reportCount: number;
  distinctReporters: number;
  reportRows: number;
  reportRowReporters: number;
  reasons: Record<string, number>;
  reportRowReasons: Record<string, number>;
}> {
  const caseRow = await pool.query<{
    id: string;
    report_count: number;
    distinct_reporters: number;
    target_id: string;
  }>(
    'select id, report_count, distinct_reporters, target_id from moderation_cases where code = $1',
    [code],
  );
  const c = caseRow.rows[0]!;
  const reasons = await pool.query<{ reason: string; count: number }>(
    'select reason, count from moderation_case_reasons where case_id = $1',
    [c.id],
  );
  const rows = await pool.query<{ reason: string; reporter_account_id: string }>(
    'select reason, reporter_account_id from reports where target_id = $1',
    [c.target_id],
  );
  const reportRowReasons: Record<string, number> = {};
  for (const r of rows.rows) reportRowReasons[r.reason] = (reportRowReasons[r.reason] ?? 0) + 1;
  return {
    reportCount: c.report_count,
    distinctReporters: c.distinct_reporters,
    reportRows: rows.rows.length,
    reportRowReporters: new Set(rows.rows.map((r) => r.reporter_account_id)).size,
    reasons: Object.fromEntries(reasons.rows.map((r) => [r.reason, r.count])),
    reportRowReasons,
  };
}

beforeAll(async () => {
  if (!url) throw new Error('DATABASE_URL_TEST is not set (check .env)');
  await runReset(url, { terminateStaleBackends: true });
  const created = createDb(url);
  db = created.db;
  pool = created.pool;
}, 120_000);

afterAll(async () => {
  await pool?.end();
});

describe('seed', () => {
  // CR-012 rewrote the counts of this test to the FD-089 prototype counts
  // (DC1–DC22) and tightened the re-run to "0 inserted for every step"; the
  // test keeps its intent (the corpus lands, a re-run inserts nothing).
  it('on an empty database inserts exactly the prototype counts and inserts nothing on a re-run', async () => {
    const firstCounts = await runSeed(db);
    expect(Object.values(firstCounts).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(await actualCounts()).toEqual(expectedCounts());

    const secondCounts = await runSeed(db);
    expect(secondCounts).toEqual({
      accounts: 0,
      config: 0,
      directory: 0,
      content: 0,
      evidence: 0,
      moderation: 0,
      notifications: 0,
    });
    expect(await actualCounts()).toEqual(expectedCounts());
  }, 180_000);

  it("pads MOD-2033's three further reports with factual, in both the reason table and the report rows", async () => {
    const facts = await caseFacts('MOD-2033');
    expect(facts.reasons).toEqual({ factual: 5, impersonation: 1 });
    expect(facts.reportRowReasons).toEqual({ factual: 5, impersonation: 1 });
    expect(facts).toMatchObject({
      reportCount: 6,
      distinctReporters: 6,
      reportRows: 6,
      reportRowReporters: 6,
    });
  });

  it('keeps the report counts, reporters and reasons of the other pre-FD-089 cases', async () => {
    expect(await caseFacts('MOD-2011')).toMatchObject({
      reportCount: 0,
      distinctReporters: 0,
      reportRows: 0,
      reasons: {},
    });
    expect(await caseFacts('MOD-2029')).toMatchObject({
      reportCount: 1,
      distinctReporters: 1,
      reportRows: 1,
      reasons: { impersonation: 1 },
    });
    expect(await caseFacts('MOD-2038')).toMatchObject({
      reportCount: 1,
      distinctReporters: 1,
      reportRows: 1,
      reasons: { privacy: 1 },
    });
    expect(await caseFacts('MOD-2041')).toMatchObject({
      reportCount: 2,
      distinctReporters: 2,
      reportRows: 2,
      reportRowReporters: 2,
      reasons: { dangerous: 1, spam: 1 },
    });
  });

  it('gives each new case as many report rows from distinct reporters as its report count', async () => {
    for (const [code, n] of [
      ['MOD-2047', 1],
      ['MOD-2045', 3],
      ['MOD-2036', 2],
      ['MOD-2031', 1],
      ['MOD-2018', 0],
    ] as const) {
      expect(await caseFacts(code), code).toMatchObject({
        reportCount: n,
        distinctReporters: n,
        reportRows: n,
        reportRowReporters: n,
      });
    }
  });

  it('puts MOD-2041 in the critical lane and every case in its prototype lane', async () => {
    const result = await pool.query<{ code: string; lane: string }>(
      'select code, lane from moderation_cases',
    );
    const lanes = Object.fromEntries(result.rows.map((r) => [r.code, r.lane]));
    expect(lanes['MOD-2041']).toBe('critical');
    expect(lanes).toEqual(Object.fromEntries(MODERATION_CASES.map((c) => [c.seedRef, c.lane])));
    expect(Object.values(lanes).filter((l) => l === 'critical')).toHaveLength(4);
    expect(Object.values(lanes).filter((l) => l === 'standard')).toHaveLength(4);
    expect(Object.values(lanes).filter((l) => l === 'appeals')).toHaveLength(2);
  });

  it("seeds both appeals as a hidden target, one hide decision and one open appeal by the target's author", async () => {
    const result = await pool.query<{
      code: string;
      status: string;
      actions: string[];
      appellant: string;
      appeal_status: string;
    }>(`
      select c.code, c.status,
             array(select d.action::text from moderation_decisions d where d.case_id = c.id) as actions,
             ap.username as appellant, a.status as appeal_status
      from moderation_cases c
      join appeals a on a.case_id = c.id
      join account_profiles ap on ap.id = a.appellant_account_id
      where c.lane = 'appeals'
      order by c.code
    `);
    expect(result.rows).toEqual([
      {
        code: 'MOD-2011',
        status: 'appealed',
        actions: ['hide'],
        appellant: 'r_ahmed',
        appeal_status: 'open',
      },
      {
        code: 'MOD-2018',
        status: 'appealed',
        actions: ['hide'],
        appellant: 'shafiq_ctg',
        appeal_status: 'open',
      },
    ]);
    expect(
      await scalar(
        "select count(*) as n from comments where seed_ref = 'k27' and state = 'hidden_pending_review'",
      ),
    ).toBe(1);
    expect(
      await scalar(
        "select count(*) as n from reviews where seed_ref = 'r4' and state = 'hidden_pending_review'",
      ),
    ).toBe(1);
  });

  it("links anon_author_r2's only persona to r2 and to no other content or reaction", async () => {
    const personas = await pool.query<{
      persona_id: string;
      kind: string;
      review_seed_ref: string | null;
    }>(`
      select pl.persona_id, p.kind, r.seed_ref as review_seed_ref
      from persona_links pl
      join account_profiles a on a.id = pl.account_id
      join personas p on p.id = pl.persona_id
      left join reviews r on r.id = pl.review_id
      where a.username = 'anon_author_r2'
    `);
    expect(personas.rows).toHaveLength(1);
    const persona = personas.rows[0]!;
    expect(persona).toMatchObject({ kind: 'anonymous', review_seed_ref: 'r2' });

    const authored = await pool.query<{ seed_ref: string }>(
      'select seed_ref from reviews where author_persona_id = $1',
      [persona.persona_id],
    );
    expect(authored.rows.map((r) => r.seed_ref)).toEqual(['r2']);
    expect(
      await scalar('select count(*) as n from comments where author_persona_id = $1', [
        persona.persona_id,
      ]),
    ).toBe(0);
    expect(
      await scalar('select count(*) as n from facility_reviews where author_persona_id = $1', [
        persona.persona_id,
      ]),
    ).toBe(0);
    expect(
      await scalar('select count(*) as n from reactions where public_persona_id = $1', [
        persona.persona_id,
      ]),
    ).toBe(0);
    expect(
      await scalar(
        "select count(*) as n from reactions x join account_profiles a on a.id = x.account_id where a.username = 'anon_author_r2'",
      ),
    ).toBe(0);
  });

  it('leaves no seeded row pointing at a missing parent', async () => {
    const orphanQueries: Record<string, string> = {
      'reviews -> doctors':
        'select count(*) as n from reviews r left join doctors d on d.id = r.doctor_id where d.id is null',
      'reviews -> personas':
        'select count(*) as n from reviews r left join personas p on p.id = r.author_persona_id where p.id is null',
      'comments -> reviews':
        'select count(*) as n from comments c left join reviews r on r.id = c.review_id where r.id is null',
      'comments -> personas':
        'select count(*) as n from comments c left join personas p on p.id = c.author_persona_id where p.id is null',
      'comments -> parent':
        'select count(*) as n from comments c left join comments p on p.id = c.parent_id where c.parent_id is not null and p.id is null',
      'evidence -> reviews':
        'select count(*) as n from evidence_items e left join reviews r on r.id = e.review_id where r.id is null',
      'follow-ups -> reviews':
        'select count(*) as n from review_follow_ups f left join reviews r on r.id = f.review_id where r.id is null',
      'facility reviews -> branches':
        'select count(*) as n from facility_reviews f left join facility_branches b on b.id = f.branch_id where b.id is null',
      'branches -> facilities':
        'select count(*) as n from facility_branches b left join facilities f on f.id = b.facility_id where f.id is null',
      'chambers -> branches':
        'select count(*) as n from doctor_chambers c left join facility_branches b on b.id = c.branch_id where c.branch_id is not null and b.id is null',
      'chambers -> doctors':
        'select count(*) as n from doctor_chambers c left join doctors d on d.id = c.doctor_id where d.id is null',
      'bookmarks -> reviews':
        'select count(*) as n from bookmarks b left join reviews r on r.id = b.review_id where r.id is null',
      'persona links -> accounts':
        'select count(*) as n from persona_links l left join account_profiles a on a.id = l.account_id where a.id is null',
      'cases -> target': `select count(*) as n from moderation_cases c
        where not exists (
          select 1 from comments x where c.target_kind = 'comment' and x.id = c.target_id
          union all select 1 from reviews x where c.target_kind = 'review' and x.id = c.target_id
          union all select 1 from evidence_items x where c.target_kind = 'evidence' and x.id = c.target_id
          union all select 1 from doctors x where c.target_kind = 'profile' and x.id = c.target_id)`,
    };
    const orphans: Record<string, number> = {};
    for (const [label, sql] of Object.entries(orphanQueries)) orphans[label] = await scalar(sql);
    expect(orphans).toEqual(
      Object.fromEntries(Object.keys(orphanQueries).map((label) => [label, 0])),
    );
  });

  it("keeps 'Not provided' demonstrable: new doctors have no about text and new branches no address, everything else filled", async () => {
    const newDoctors = await pool.query<Record<string, unknown>>(
      "select * from doctors where seed_ref in ('d7', 'd8', 'd9', 'd10') order by seed_ref",
    );
    expect(newDoctors.rows).toHaveLength(4);
    for (const d of newDoctors.rows) {
      expect(d, String(d.seed_ref)).toMatchObject({ about_en: null, about_bn: null });
      for (const column of [
        'name_en',
        'name_bn',
        'specialty_id',
        'qualifications_en',
        'qualifications_bn',
        'bmdc_number',
        'gender',
        'languages_en',
        'languages_bn',
        'fee_display_en',
        'fee_display_bn',
        'city_en',
        'city_bn',
        'area_en',
        'area_bn',
      ]) {
        expect(d[column], `${String(d.seed_ref)}.${column}`).not.toBeNull();
      }
    }
    const newBranches = await pool.query<Record<string, unknown>>(
      "select * from facility_branches where seed_ref in ('f6', 'f7', 'f8', 'f9', 'f10') order by seed_ref",
    );
    expect(newBranches.rows).toHaveLength(5);
    for (const b of newBranches.rows) {
      expect(b, String(b.seed_ref)).toMatchObject({ address_en: null, address_bn: null });
      for (const column of ['name_en', 'name_bn', 'city_en', 'city_bn', 'area_en', 'area_bn']) {
        expect(b[column], `${String(b.seed_ref)}.${column}`).not.toBeNull();
      }
    }
  });

  it("links d7's two composite-named chambers to branches f6 and f7", async () => {
    const result = await pool.query<{ seed_ref: string | null }>(`
      select b.seed_ref from doctor_chambers c
      join doctors d on d.id = c.doctor_id
      left join facility_branches b on b.id = c.branch_id
      where d.seed_ref = 'd7' order by c.sort_order
    `);
    expect(result.rows.map((r) => r.seed_ref)).toEqual(['f6', 'f7']);
  });

  it('sentiment distribution for d1 counts only published reviews', async () => {
    const result = await pool.query<{ sentiment: string; n: string }>(`
      select r.sentiment, count(*)::text as n
      from reviews r
      join doctors d on d.id = r.doctor_id
      where d.seed_ref = 'd1' and r.state = 'published'
      group by r.sentiment
    `);
    const bySentiment = Object.fromEntries(
      result.rows.map((row) => [row.sentiment, Number(row.n)]),
    );
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

  it('counts each condition by FD-101 as the corpus wording gives, c8 at 0 and r2, r21, r8 unmatched (U46)', async () => {
    const lowerNfc = (s: string) => s.normalize('NFC').toLowerCase();
    const published = new Set(
      (
        await pool.query<{ seed_ref: string }>(`
          select r.seed_ref from reviews r join doctors d on d.id = r.doctor_id
          where r.state = 'published' and r.deleted_at is null and r.published_at is not null
            and d.state = 'published' and d.merged_into_id is null
        `)
      ).rows.map((r) => r.seed_ref),
    );
    const namesOf = (c: (typeof CONDITIONS)[number]) =>
      [
        c.name.en,
        c.name.bn,
        ...ALIASES.filter((a) => a.termSeedRef === c.seedRef).map((a) => a.alias),
      ].map(lowerNfc);
    const isAbout = (r: (typeof REVIEWS)[number], c: (typeof CONDITIONS)[number]) =>
      r.tags.some(
        (t) => t.group === 'condition' && namesOf(c).includes(lowerNfc(t.text.bn.trim())),
      );
    const terms = await pool.query<{ id: string; seed_ref: string }>(
      "select id, seed_ref from taxonomy_terms where kind = 'condition'",
    );
    const totals = await new PgReviewReadRepository().totalsForTerms(
      appTxOf(db),
      terms.rows.map((t) => t.id),
    );

    for (const term of terms.rows) {
      const condition = CONDITIONS.find((c) => c.seedRef === term.seed_ref)!;
      const expected = REVIEWS.filter((r) => published.has(r.seedRef) && isAbout(r, condition));
      expect({ [term.seed_ref]: totals.get(term.id) }).toEqual({
        [term.seed_ref]: expected.length,
      });
    }
    expect(terms.rows).toHaveLength(10);
    expect([...totals.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(totals.get(terms.rows.find((t) => t.seed_ref === 'c8')!.id)).toBe(0);
    for (const seedRef of ['r2', 'r21', 'r8']) {
      const review = REVIEWS.find((r) => r.seedRef === seedRef)!;
      expect(CONDITIONS.some((c) => isAbout(review, c))).toBe(false);
    }
  });

  it('gives f1 its own name, label and hue, f2 no own name, and every branch its corpus hue (U46)', async () => {
    const result = await pool.query<{
      seed_ref: string;
      name_en: string;
      own_name_en: string | null;
      own_name_bn: string | null;
      avatar_hue: number | null;
    }>('select seed_ref, name_en, own_name_en, own_name_bn, avatar_hue from facility_branches');
    const bySeedRef = new Map(result.rows.map((r) => [r.seed_ref, r]));

    expect(bySeedRef.get('f1')).toMatchObject({
      name_en: 'Dhanmondi branch',
      own_name_en: 'Shefa General Hospital',
      own_name_bn: 'শেফা জেনারেল হাসপাতাল',
      avatar_hue: BRANCHES.find((b) => b.seedRef === 'f1')!.avatarHue,
    });
    expect(bySeedRef.get('f2')).toMatchObject({ own_name_en: null, own_name_bn: null });
    for (const branch of BRANCHES) {
      expect(bySeedRef.get(branch.seedRef)?.avatar_hue).toBe(branch.avatarHue);
    }
  });

  it('suggests the prototype chips in order and keeps ten conditions (U46, BR4.5)', async () => {
    const taxonomy = new PgTaxonomyModuleRepository();
    const tx = appTxOf(db);
    const conditionNames = SUGGESTED_CONDITION_SEED_REFS.map(
      (ref) => CONDITIONS.find((c) => c.seedRef === ref)!.name.en,
    );

    expect((await taxonomy.listSuggested(tx, 'condition', 'en')).map((t) => t.nameEn)).toEqual(
      conditionNames,
    );
    for (const kind of ['symptom', 'treatment', 'medicine'] as const) {
      expect((await taxonomy.listSuggested(tx, kind, 'en')).map((t) => t.nameEn)).toEqual(
        SUGGESTED_TERMS.filter((t) => t.kind === kind).map((t) => t.en),
      );
    }
    expect(await scalar("select count(*) as n from taxonomy_terms where kind = 'condition'")).toBe(
      10,
    );
  });

  it('facility_reviews never reference doctors', async () => {
    const result = await pool.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'facility_reviews' and column_name ilike '%doctor%'
    `);
    expect(result.rows).toHaveLength(0);
  });
});
