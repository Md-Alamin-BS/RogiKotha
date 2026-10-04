// `pnpm db:seed` — idempotent seeding of the demo database through direct
// Drizzle inserts (task's "Not in scope": application commands do not
// exist yet — every module task from T-101 onward is still unbuilt, so
// there is no command layer to seed "through"; 01-conventions.md §1's
// "idempotent seeding through application commands, never raw inserts
// except auth tables" describes the end state once those commands exist.
// Logged as an `ISS-` row).
//
// Connects with `DATABASE_URL` (refuses on `APP_MODE=production`), runs
// each step in its own transaction, in order. Every step is idempotent by
// a natural key (`seed_ref` where the table has one; username/code/target
// elsewhere) — skip rows that exist, update nothing; a re-run after
// `demo:reset` recreates everything from empty, a re-run on a live
// database inserts nothing.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createDb, type Db } from '@rogikotha/database';
import { config as loadDotenv } from 'dotenv';

// Loads the repo-root `.env` before anything reads `process.env` — same
// approach as `packages/database/src/env.ts` (that file is not part of
// `@rogikotha/database`'s public entry point, so it is inlined here rather
// than imported across the package boundary).
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
loadDotenv({ path: path.resolve(repoRoot, '.env') });

import { seedAccounts } from './seed-accounts.js';
import { seedConfig } from './seed-config.js';
import { seedContent } from './seed-content.js';
import { seedDirectory } from './seed-directory.js';
import { seedEvidence } from './seed-evidence.js';
import { seedModeration } from './seed-moderation.js';

/**
 * Lookup maps threaded through every seed step, so a later step (e.g.
 * seed-content.ts inserting a review) can resolve the real database id
 * behind a corpus `seedRef` without re-querying. Populated by the step
 * that owns the table; every step checks the database first, so a re-run
 * rebuilds the same maps from existing rows instead of inserting
 * duplicates.
 */
export interface SeedContext {
  accountIdByUsername: Map<string, string>;
  authUserIdByUsername: Map<string, string>;
  personaIdByKey: Map<string, string>;
  taxonomyTermIdBySeedRef: Map<string, string>;
  orgIdBySeedRef: Map<string, string>;
  branchIdBySeedRef: Map<string, string>;
  doctorIdBySeedRef: Map<string, string>;
  reviewIdBySeedRef: Map<string, string>;
  reviewPublicIdBySeedRef: Map<string, string>;
  facilityReviewIdBySeedRef: Map<string, string>;
  commentIdBySeedRef: Map<string, string>;
  evidenceItemIdBySeedRef: Map<string, string>;
  evidenceItemPublicIdBySeedRef: Map<string, string>;
  legalHoldIdByTarget: Map<string, string>;
  submissionIdBySeedRef: Map<string, string>;
}

export function newSeedContext(): SeedContext {
  return {
    accountIdByUsername: new Map(),
    authUserIdByUsername: new Map(),
    personaIdByKey: new Map(),
    taxonomyTermIdBySeedRef: new Map(),
    orgIdBySeedRef: new Map(),
    branchIdBySeedRef: new Map(),
    doctorIdBySeedRef: new Map(),
    reviewIdBySeedRef: new Map(),
    reviewPublicIdBySeedRef: new Map(),
    facilityReviewIdBySeedRef: new Map(),
    commentIdBySeedRef: new Map(),
    evidenceItemIdBySeedRef: new Map(),
    evidenceItemPublicIdBySeedRef: new Map(),
    legalHoldIdByTarget: new Map(),
    submissionIdBySeedRef: new Map(),
  };
}

export interface SeedCounts {
  [step: string]: number;
}

/** Runs every seed step in order against `db`, returning inserted-row counts per step. */
export async function runSeed(db: Db): Promise<SeedCounts> {
  const ctx = newSeedContext();
  const counts: SeedCounts = {};

  // seed-accounts first (not the task text's literal "seed-config, then
  // seed-accounts" order): config_versions/retention_policies/legal_holds
  // all have a NOT NULL `actor_account_id` FK, so at least one account —
  // the seeded `sa_founder` — must exist before either can be inserted.
  // Narrower, reversible reordering; see ISSUES.md.
  counts.accounts = await seedAccounts(db, ctx);
  counts.config = await seedConfig(db, ctx);
  counts.directory = await seedDirectory(db, ctx);
  counts.content = await seedContent(db, ctx);
  counts.evidence = await seedEvidence(db, ctx);
  counts.moderation = await seedModeration(db, ctx);

  return counts;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.env.APP_MODE === 'production') {
    throw new Error('db:seed refuses to run with APP_MODE=production');
  }
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  runSeed(db)
    .then((counts) => {
      for (const [step, n] of Object.entries(counts)) {
        // eslint-disable-next-line no-console -- CLI summary output.
        console.log(`${step}: ${n} inserted`);
      }
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
