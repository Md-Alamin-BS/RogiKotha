// Cumulative smoke suite (04-handoff-and-validation.md §3.1) — T-005's first
// `packages/database` smoke assertion, now collectable at all after
// ISS-109's `vitest.config.ts` fix. Not in this task's literal "Owned
// paths" list (only `*.int.test.ts` is named there), added anyway per the
// coordinating session's explicit instruction to add at least one smoke
// assertion for what this task built — the narrower, reversible read of an
// otherwise-unnamed file type.
//
// This package has almost no behaviour that does not touch PostgreSQL, so
// unlike the pure, infra-free smoke tests in `contracts`/`i18n`, this one
// needs the compose stack up — same as every `*.int.test.ts` file here.
// Kept to a single assertion: the schema module's full surface loads
// through the package's one entry point, and the FD-037 default-deny flip
// (this task's single most significant change) actually holds against a
// live database.
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { evidenceItems, reviewTags } from './index';
import { workerUrlForTestDb } from './test-setup';

describe('database package smoke', () => {
  it('loads the full schema surface and rk_worker is denied by default (FD-037)', async () => {
    expect(evidenceItems).toBeDefined();
    expect(reviewTags).toBeDefined();

    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('select * from review_tags limit 1')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });

  // CR-006 probe P9: the FD-041 revoke in 0007_revoke_worker_auth_users.sql.
  it('rk_worker cannot read an account email from auth_users (FD-041)', async () => {
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('select email from auth_users limit 1')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });
});
