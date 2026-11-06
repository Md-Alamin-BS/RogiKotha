// PgPrivateIdentityRepository and the U11 migration against DATABASE_URL_TEST (U11 functional-spec
// § 9, database row): every method, both partial unique indexes, the deferred review key, the
// savepoint, concurrent first use and the worker's missing grant (BR1.2, BR2.1–BR2.9, BR3.3, BR3.4).
import { randomBytes } from 'node:crypto';

import { createIdentityModule, type Logger } from '@rogikotha/application';
import { newId, newPublicId } from '@rogikotha/contracts';
import { eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { doctors } from '../schema/directory';
import { personaLinks, personas } from '../schema/identity';
import { reviews } from '../schema/review';
import { testDb, workerUrlForTestDb } from '../test-setup';
import { appTxOf, type Executor } from '../unit-of-work';
import { PgAccountRepository } from './account';
import { appTx, buildAccount, uniqueSuffix } from './account-test-support';
import { PgIdentityRepository } from './identity';
import { PgPrivateIdentityRepository } from './identity-private';

const repo = new PgPrivateIdentityRepository();
const tx = appTx(testDb);

function alias(): string {
  // Synthetic, inside the index's `patient-%` range; the real generator is tested in the domain.
  return `patient-${uniqueSuffix()}`.slice(0, 21);
}

async function accountWithDefaults() {
  const account = await buildAccount(testDb);
  const ids = await repo.createDefault(tx, {
    accountId: account.accountId,
    username: account.username,
    displayName: account.displayName,
  });
  return { ...account, ...ids };
}

async function buildReview(authorPersonaId: string, reviewId: string = newId()): Promise<string> {
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic Haque',
      nameBn: 'ডা. কৃত্রিম হক',
      state: 'published',
      nameKey: `synthetic-${newId()}`,
    })
    .returning({ id: doctors.id });
  await insertReview(testDb, reviewId, authorPersonaId, doctor!.id);
  return reviewId;
}

async function insertReview(
  db: Executor,
  reviewId: string,
  authorPersonaId: string,
  doctorId: string,
): Promise<void> {
  await db.insert(reviews).values({
    id: reviewId,
    publicId: newPublicId(),
    authorPersonaId,
    doctorId,
    kind: 'quick',
    relationship: 'self',
    identityMode: 'anonymous',
    periodYear: 2026,
    periodMonth: 3,
    title: 'A synthetic experience',
    body: 'Synthetic body.',
    language: 'en',
    state: 'published',
    publishedAt: new Date(),
  });
}

async function linksOf(accountId: string) {
  return testDb.select().from(personaLinks).where(eq(personaLinks.accountId, accountId));
}

const silentLogger: Logger = { info() {}, warn() {}, error() {} };

const FOREIGN_KEY_VIOLATION = '23503';

/** The PostgreSQL error code, looking through Drizzle's wrapping errors. */
function pgCodeOf(error: unknown): unknown {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const fields = current as { code?: unknown; cause?: unknown };
    if (typeof fields.code === 'string') return fields.code;
    current = fields.cause;
  }
  return undefined;
}

describe('U11 migration', () => {
  it('creates both partial unique indexes by name with their WHERE clauses (R-01)', async () => {
    const { rows } = await testDb.execute<{ indexname: string; indexdef: string }>(
      sql`select indexname, indexdef from pg_indexes
          where schemaname = 'public'
            and indexname in ('personas_anonymous_alias_uq', 'persona_links_account_review_uq')
          order by indexname`,
    );

    expect(rows.map((row) => row.indexname)).toEqual([
      'persona_links_account_review_uq',
      'personas_anonymous_alias_uq',
    ]);
    const [links, aliases] = rows;
    expect(links!.indexdef).toMatch(/^CREATE UNIQUE INDEX .* \(account_id, review_id\)/);
    expect(links!.indexdef).toMatch(/WHERE \(review_id IS NOT NULL\)/);
    expect(aliases!.indexdef).toMatch(/^CREATE UNIQUE INDEX .* \(display_name\)/);
    expect(aliases!.indexdef).toMatch(/kind = 'anonymous'::identity_mode/);
    expect(aliases!.indexdef).toMatch(/display_name ~~ 'patient-%'::text/);
  });

  it('refuses a second anonymous persona with the same alias (BR2.6)', async () => {
    const taken = alias();
    await testDb.insert(personas).values({ kind: 'anonymous', displayName: taken, avatarHue: 0 });

    await expect(
      testDb.insert(personas).values({ kind: 'anonymous', displayName: taken, avatarHue: 0 }),
    ).rejects.toMatchObject({ cause: { constraint: 'personas_anonymous_alias_uq' } });
  });

  it('leaves the legacy seeded "Anonymous" rows and non-anonymous names outside the alias index', async () => {
    const shared = `patient-${uniqueSuffix()}`;
    const rows = await testDb
      .insert(personas)
      .values([
        { kind: 'anonymous', displayName: 'Anonymous', avatarHue: 0 },
        { kind: 'anonymous', displayName: 'Anonymous', avatarHue: 0 },
        { kind: 'named', displayName: shared },
        { kind: 'pseudonymous', displayName: shared },
      ])
      .returning({ id: personas.id });

    expect(rows).toHaveLength(4);
  });

  it('lets one transaction write a persona and its link first and their review later (BR2.9)', async () => {
    const account = await accountWithDefaults();
    const [doctor] = await testDb
      .insert(doctors)
      .values({
        publicId: newPublicId(),
        nameEn: 'Dr. Synthetic Kabir',
        nameBn: 'ডা. কৃত্রিম কবির',
        state: 'published',
        nameKey: `synthetic-${newId()}`,
      })
      .returning({ id: doctors.id });
    const reviewId = newId();

    await testDb.transaction(async (outer) => {
      const inserted = await repo.insertAnonymous(appTxOf(outer), {
        accountId: account.accountId,
        reviewId,
        alias: alias(),
      });
      if (!inserted.ok) throw new Error(inserted.error.code);
      await insertReview(outer, reviewId, inserted.data.personaId, doctor!.id);
    });

    expect(await repo.findAnonymous(tx, account.accountId, reviewId)).not.toBeNull();
  });

  it('still refuses at commit a link to a review that never appears', async () => {
    const account = await accountWithDefaults();
    const reviewId = newId();

    await expect(
      testDb.transaction(async (outer) => {
        await repo.insertAnonymous(appTxOf(outer), {
          accountId: account.accountId,
          reviewId,
          alias: alias(),
        });
      }),
    ).rejects.toSatisfy((error) => pgCodeOf(error) === FOREIGN_KEY_VIOLATION);
    expect(await repo.findAnonymous(tx, account.accountId, reviewId)).toBeNull();
  });

  it('gives rk_worker no access to persona_links (BR3.7)', async () => {
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('select persona_id from persona_links limit 1')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });
});

describe('PgPrivateIdentityRepository.createDefault', () => {
  it('inserts one named and one pseudonymous persona with unscoped links, using the given ids (BR1.2)', async () => {
    const account = await buildAccount(testDb, { displayName: 'Nasrin Synthetic' });
    const namedPersonaId = newId();
    const pseudonymousPersonaId = newId();

    const ids = await repo.createDefault(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: 'Nasrin Synthetic',
      namedPersonaId,
      pseudonymousPersonaId,
    });

    expect(ids).toEqual({ namedPersonaId, pseudonymousPersonaId });
    const created = await new PgIdentityRepository().byIds(tx, [
      namedPersonaId,
      pseudonymousPersonaId,
    ]);
    expect(created).toEqual(
      expect.arrayContaining([
        {
          id: namedPersonaId,
          kind: 'named',
          displayName: 'Nasrin Synthetic',
          username: account.username,
          avatarHue: null,
        },
        {
          id: pseudonymousPersonaId,
          kind: 'pseudonymous',
          displayName: account.username,
          username: account.username,
          avatarHue: null,
        },
      ]),
    );
    const links = await linksOf(account.accountId);
    expect(links.map((link) => link.reviewId)).toEqual([null, null]);
  });

  it('returns the existing pair and writes nothing when called again', async () => {
    const account = await accountWithDefaults();

    const again = await repo.createDefault(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: account.displayName,
      namedPersonaId: newId(),
      pseudonymousPersonaId: newId(),
    });

    expect(again).toEqual({
      namedPersonaId: account.namedPersonaId,
      pseudonymousPersonaId: account.pseudonymousPersonaId,
    });
    expect(await linksOf(account.accountId)).toHaveLength(2);
  });

  it('is what account registration still calls to create both personas (BR3.2, R-07)', async () => {
    const account = await buildAccount(testDb);

    await new PgAccountRepository().insertDefaultPersonas(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: account.displayName,
      namedPersonaId: newId(),
      pseudonymousPersonaId: newId(),
    });

    expect((await repo.currentOf(tx, account.accountId, 'named'))?.kind).toBe('named');
    expect((await repo.currentOf(tx, account.accountId, 'pseudonymous'))?.kind).toBe(
      'pseudonymous',
    );
  });
});

describe('PgPrivateIdentityRepository.createMissingDefault', () => {
  it('creates the missing persona from the live profile and links it (BR2.2)', async () => {
    const account = await buildAccount(testDb, { displayName: 'Farida Synthetic' });

    const named = await repo.createMissingDefault(tx, account.accountId, 'named');
    const pseudonymous = await repo.createMissingDefault(tx, account.accountId, 'pseudonymous');

    expect(await repo.currentOf(tx, account.accountId, 'named')).toEqual({
      id: named,
      kind: 'named',
      displayName: 'Farida Synthetic',
      username: account.username,
      avatarHue: null,
    });
    expect(await repo.currentOf(tx, account.accountId, 'pseudonymous')).toMatchObject({
      id: pseudonymous,
      displayName: account.username,
    });
  });

  it('creates nothing for a deleted, unknown or malformed account', async () => {
    const account = await buildAccount(testDb);
    await new PgAccountRepository().updateStatus(tx, account.accountId, 'deleted');

    expect(await repo.createMissingDefault(tx, account.accountId, 'named')).toBeNull();
    expect(await repo.createMissingDefault(tx, newId(), 'named')).toBeNull();
    expect(await repo.createMissingDefault(tx, 'not-a-uuid', 'named')).toBeNull();
    expect(await linksOf(account.accountId)).toEqual([]);
  });
});

describe('PgPrivateIdentityRepository.currentOf and insertNamed', () => {
  it('answers the newest persona of that kind after a rename snapshot (BR2.1, BR4.1)', async () => {
    const account = await buildAccount(testDb);

    const { first, renamed } = await testDb.transaction(async (outer) => {
      // One connection, so PostgreSQL 18's uuidv7() is monotonic across both inserts.
      const inner = appTxOf(outer);
      const ids = await repo.createDefault(inner, {
        accountId: account.accountId,
        username: account.username,
        displayName: account.displayName,
      });
      const renamedId = await repo.insertNamed(inner, {
        accountId: account.accountId,
        displayName: 'Renamed Synthetic',
        username: account.username,
        avatarHue: null,
      });
      return { first: ids.namedPersonaId, renamed: renamedId };
    });

    expect(renamed).not.toBe(first);
    expect(await repo.currentOf(tx, account.accountId, 'named')).toMatchObject({
      id: renamed,
      displayName: 'Renamed Synthetic',
    });
    expect(await repo.owns(tx, account.accountId, first)).toBe(true);
  });

  it('finds nothing for an account without personas or a malformed id', async () => {
    const account = await buildAccount(testDb);

    expect(await repo.currentOf(tx, account.accountId, 'named')).toBeNull();
    expect(await repo.currentOf(tx, 'not-a-uuid', 'named')).toBeNull();
  });
});

describe('PgPrivateIdentityRepository anonymous personas', () => {
  it('inserts an anonymous persona scoped to its thread and finds it again (BR2.3, BR2.5)', async () => {
    const account = await accountWithDefaults();
    const reviewId = await buildReview(account.namedPersonaId);
    const name = alias();

    const inserted = await repo.insertAnonymous(tx, {
      accountId: account.accountId,
      reviewId,
      alias: name,
    });

    expect(inserted.ok).toBe(true);
    const personaId = inserted.ok ? inserted.data.personaId : '';
    expect(await repo.findAnonymous(tx, account.accountId, reviewId)).toBe(personaId);
    expect(await new PgIdentityRepository().byIds(tx, [personaId])).toEqual([
      { id: personaId, kind: 'anonymous', displayName: name, username: null, avatarHue: 0 },
    ]);
  });

  it('answers thread_taken for a second persona in the same thread and alias_taken for a used alias', async () => {
    const first = await accountWithDefaults();
    const second = await accountWithDefaults();
    const reviewId = await buildReview(first.namedPersonaId);
    const otherReviewId = await buildReview(second.namedPersonaId);
    const name = alias();
    await repo.insertAnonymous(tx, { accountId: first.accountId, reviewId, alias: name });

    expect(
      await repo.insertAnonymous(tx, { accountId: first.accountId, reviewId, alias: alias() }),
    ).toEqual({ ok: false, error: { code: 'thread_taken' } });
    expect(
      await repo.insertAnonymous(tx, {
        accountId: second.accountId,
        reviewId: otherReviewId,
        alias: name,
      }),
    ).toEqual({ ok: false, error: { code: 'alias_taken' } });
    expect(await repo.findAnonymous(tx, second.accountId, otherReviewId)).toBeNull();
  });

  it('keeps the caller transaction usable after alias_taken, so a retry commits (BR2.6)', async () => {
    const first = await accountWithDefaults();
    const second = await accountWithDefaults();
    const reviewId = await buildReview(first.namedPersonaId);
    const otherReviewId = await buildReview(second.namedPersonaId);
    const name = alias();
    await repo.insertAnonymous(tx, { accountId: first.accountId, reviewId, alias: name });

    const retried = await testDb.transaction(async (outer) => {
      const inner = appTxOf(outer);
      const input = { accountId: second.accountId, reviewId: otherReviewId };
      const clash = await repo.insertAnonymous(inner, { ...input, alias: name });
      expect(clash).toEqual({ ok: false, error: { code: 'alias_taken' } });
      return repo.insertAnonymous(inner, { ...input, alias: alias() });
    });

    expect(retried.ok).toBe(true);
    expect(await repo.findAnonymous(tx, second.accountId, otherReviewId)).toBe(
      retried.ok ? retried.data.personaId : 'missing',
    );
  });

  it('returns null for malformed ids instead of failing the query', async () => {
    expect(await repo.findAnonymous(tx, 'not-a-uuid', newId())).toBeNull();
    expect(await repo.findAnonymous(tx, newId(), 'not-a-uuid')).toBeNull();
  });

  it('gives ten concurrent first uses of one thread a single persona (BR2.4, BR2.6)', async () => {
    const account = await accountWithDefaults();
    const reviewId = await buildReview(account.namedPersonaId);
    const identity = createIdentityModule({
      identities: new PgIdentityRepository(),
      privateIdentities: repo.asPort(),
      crypto: { randomToken: () => randomBytes(32).toString('base64url') },
      logger: silentLogger,
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        testDb.transaction((outer) =>
          identity.personaFor(appTxOf(outer), {
            accountId: account.accountId,
            reviewId,
            mode: 'anonymous',
          }),
        ),
      ),
    );

    const ids = new Set(results.map((result) => (result.ok ? result.data.personaId : 'failed')));
    expect([...ids]).toHaveLength(1);
    expect(ids.has('failed')).toBe(false);
    const scoped = (await linksOf(account.accountId)).filter((link) => link.reviewId === reviewId);
    expect(scoped).toHaveLength(1);
  });
});

describe('PgPrivateIdentityRepository ownership', () => {
  it('owns answers true only for a persona linked to that account (BR3.3)', async () => {
    const owner = await accountWithDefaults();
    const other = await accountWithDefaults();

    expect(await repo.owns(tx, owner.accountId, owner.namedPersonaId)).toBe(true);
    expect(await repo.owns(tx, other.accountId, owner.namedPersonaId)).toBe(false);
    expect(await repo.owns(tx, owner.accountId, newId())).toBe(false);
    expect(await repo.owns(tx, owner.accountId, 'not-a-uuid')).toBe(false);
    expect(await repo.owns(tx, 'not-a-uuid', owner.namedPersonaId)).toBe(false);
  });

  it('personaIdsOf lists every linked persona in id order, at most the limit (BR3.4)', async () => {
    const owner = await accountWithDefaults();
    const reviewId = await buildReview(owner.namedPersonaId);
    const inserted = await repo.insertAnonymous(tx, {
      accountId: owner.accountId,
      reviewId,
      alias: alias(),
    });
    const anonymousId = inserted.ok ? inserted.data.personaId : '';
    const all = [owner.namedPersonaId, owner.pseudonymousPersonaId, anonymousId].sort();

    expect(await repo.personaIdsOf(tx, owner.accountId, 1000)).toEqual(all);
    expect(await repo.personaIdsOf(tx, owner.accountId, 2)).toEqual(all.slice(0, 2));
    expect(await repo.personaIdsOf(tx, 'not-a-uuid', 1000)).toEqual([]);
  });
});
