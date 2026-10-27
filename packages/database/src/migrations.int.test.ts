import {
  ACCOUNT_STATUSES,
  APPEAL_STATUSES,
  ARTIFACT_KINDS,
  CASE_STATUSES,
  CRITERIA,
  CRITERION_VALUES,
  CUSTODY_EVENTS,
  DATA_REQUEST_KINDS,
  DATA_REQUEST_STATUSES,
  DELETION_ACTIONS,
  ENFORCEMENT_KINDS,
  EVIDENCE_FAIL_REASONS,
  EVIDENCE_GROUPS,
  EVIDENCE_STATES,
  FACILITY_TYPES,
  FOLLOW_UP_KINDS,
  IDENTITY_MODES,
  LOCALES,
  MODERATION_ACTIONS,
  MODERATION_LANES,
  NOTIFICATION_KINDS,
  OUTCOMES,
  PROVENANCES,
  PUBLICATION_STATES,
  REACTION_VALUES,
  RELATIONSHIPS,
  REPORT_REASONS,
  REVIEW_KINDS,
  SEARCH_KINDS,
  SENTIMENTS,
  STAFF_NOTIFICATION_KINDS,
  STAFF_ROLES,
  SUBMISSION_STATUSES,
  TAG_GROUPS,
  TARGET_KINDS,
  TERM_KINDS,
} from '@rogikotha/contracts';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { assertAllowlisted, PgAuditWriter } from './audit-writer';
import { auditEvents } from './schema/index';
import { testDb, workerUrlForTestDb } from './test-setup';

// Mirrors `schema/enums.ts`'s pg enum name -> contracts array. Kept
// independent of that file's own list so a typo in one does not hide a
// typo in the other.
const EXPECTED_ENUMS: Record<string, readonly string[]> = {
  locale: LOCALES,
  account_status: ACCOUNT_STATUSES,
  staff_role: STAFF_ROLES,
  identity_mode: IDENTITY_MODES,
  provenance: PROVENANCES,
  publication_state: PUBLICATION_STATES,
  review_kind: REVIEW_KINDS,
  relationship: RELATIONSHIPS,
  sentiment: SENTIMENTS,
  outcome: OUTCOMES,
  tag_group: TAG_GROUPS,
  term_kind: TERM_KINDS,
  facility_type: FACILITY_TYPES,
  criterion: CRITERIA,
  criterion_value: CRITERION_VALUES,
  evidence_group: EVIDENCE_GROUPS,
  evidence_state: EVIDENCE_STATES,
  evidence_fail_reason: EVIDENCE_FAIL_REASONS,
  artifact_kind: ARTIFACT_KINDS,
  custody_event: CUSTODY_EVENTS,
  follow_up_kind: FOLLOW_UP_KINDS,
  reaction_value: REACTION_VALUES,
  report_reason: REPORT_REASONS,
  moderation_lane: MODERATION_LANES,
  case_status: CASE_STATUSES,
  moderation_action: MODERATION_ACTIONS,
  appeal_status: APPEAL_STATUSES,
  enforcement_kind: ENFORCEMENT_KINDS,
  notification_kind: NOTIFICATION_KINDS,
  staff_notification_kind: STAFF_NOTIFICATION_KINDS,
  submission_status: SUBMISSION_STATUSES,
  data_request_kind: DATA_REQUEST_KINDS,
  data_request_status: DATA_REQUEST_STATUSES,
  deletion_action: DELETION_ACTIONS,
  search_kind: SEARCH_KINDS,
  target_kind: TARGET_KINDS,
};

const EXPECTED_TABLES = [
  'auth_users',
  'auth_sessions',
  'auth_accounts',
  'auth_verifications',
  'account_profiles',
  'account_preferences',
  'staff_devices',
  'staff_device_approvals',
  'enforcements',
  'feedback',
  'bookmarks',
  'blocks',
  'personas',
  'persona_links',
  'identity_reveals',
  'doctors',
  'doctor_chambers',
  'facilities',
  'facility_branches',
  'profile_submissions',
  'profile_claims',
  'profile_field_changes',
  'profile_redirects',
  'profile_merges',
  'taxonomy_terms',
  'taxonomy_aliases',
  'audit_events',
  'config_versions',
  'config_changes',
  'demo_clock',
];

describe('migrations apply from an empty database', () => {
  it('creates the drizzle migrations table with every migration applied', async () => {
    // drizzle-orm's migrator table has no `tag` column — only `id`/`hash`/`created_at`.
    // Was 2 (0000_init, 0001_grants_part1) at T-004; T-005 added four more
    // (0002_content, 0003_triggers, 0004_deferred_fks, 0005_grants_part2) —
    // matched that task's own acceptance table ("6 migrations applied").
    // T-009 adds a seventh (0006_pgboss_grants — 02-data-model.md §16 note
    // 2 / task step 2). Not in T-009's owned paths, but this specific count
    // is a direct, expected, mechanical consequence of T-009's own
    // migration (same class of fix as `ISS-085`/`ISS-125`), not a silent
    // redesign of the test. CR-006 adds 0007_revoke_worker_auth_users and
    // 0008_worker_grant_review (FD-041, FD-092), the same kind of mechanical
    // consequence (ISS-242).
    const rows = await testDb.execute(sql`select hash from drizzle_migrations order by id`);
    expect(rows.rows).toHaveLength(9);
  });

  it('creates every §1–§5, §9, §11, §15 table', async () => {
    const rows = await testDb.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = new Set(rows.rows.map((r) => r.table_name));
    for (const table of EXPECTED_TABLES) {
      expect(names.has(table), `missing table ${table}`).toBe(true);
    }
  });
});

describe('every enum from contracts exists in the database with identical values', () => {
  it('matches pg_enum for every enum name', async () => {
    for (const [enumName, expectedValues] of Object.entries(EXPECTED_ENUMS)) {
      const rows = await testDb.execute<{ enumlabel: string }>(sql`
        select e.enumlabel
        from pg_type t
        join pg_enum e on e.enumtypid = t.oid
        where t.typname = ${enumName}
        order by e.enumsortorder
      `);
      const actual = rows.rows.map((r) => r.enumlabel);
      expect(actual, `enum ${enumName}`).toEqual([...expectedValues]);
    }
  });
});

describe('audit writer', () => {
  it('inserts an allowlisted row', async () => {
    const writer = new PgAuditWriter();
    await testDb.transaction(async (tx) => {
      await writer.write(tx, {
        stream: 'account:test-stream',
        action: 'test_action',
        actor: 'system:test',
        details: { count: 3 },
      });
    });
    const rows = await testDb
      .select()
      .from(auditEvents)
      .where(sql`${auditEvents.stream} = 'account:test-stream'`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.details).toEqual({ count: 3 });
  });

  it('rejects a details object containing an email key', async () => {
    const writer = new PgAuditWriter();
    await expect(
      testDb.transaction(async (tx) => {
        await writer.write(tx, {
          stream: 'account:test-stream-2',
          action: 'test_action',
          actor: 'system:test',
          details: { email: 'someone@example.com' },
        });
      }),
    ).rejects.toThrow();
  });

  it('rejects a string value over 200 chars', () => {
    expect(() => assertAllowlisted({ note: 'x'.repeat(201) })).toThrow();
  });
});

describe('worker role grants', () => {
  it('rk_worker cannot select from persona_links', async () => {
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('select * from persona_links limit 1')).rejects.toThrow(/permission denied/i);
    } finally {
      await pool.end();
    }
  });
});
