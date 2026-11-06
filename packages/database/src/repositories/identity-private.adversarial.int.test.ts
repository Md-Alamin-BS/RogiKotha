// U11 Step 17, high-risk adversarial tests against DATABASE_URL_TEST (functional-spec § 8.1–8.5),
// written by an agent that did not build the repositories. Each test attacks the real tables:
// correlation across threads, an ownership oracle with forged ids, the worker's reach into
// `persona_links` (including planner statistics), alias exhaustion inside a live transaction and
// looking an alias up by name.
import { randomBytes } from 'node:crypto';

import { createIdentityModule, type LogFields, type Logger } from '@rogikotha/application';
import { newId, newPublicId } from '@rogikotha/contracts';
import { and, eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { doctors } from '../schema/directory';
import { personaLinks, personas } from '../schema/identity';
import { reviews } from '../schema/review';
import { testDb, workerUrlForTestDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { appTx, buildAccount } from './account-test-support';
import { PgIdentityRepository } from './identity';
import { PgPrivateIdentityRepository } from './identity-private';

const repo = new PgPrivateIdentityRepository();
const publicRepo = new PgIdentityRepository();
const tx = appTx(testDb);
const PERMISSION_DENIED = /permission denied/i;
const ALIAS = /^patient-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/;

class CapturingLogger implements Logger {
  readonly lines: { event: string; fields: LogFields }[] = [];
  info(event: string, fields: LogFields = {}) {
    this.lines.push({ event, fields });
  }
  warn(event: string, fields: LogFields = {}) {
    this.lines.push({ event, fields });
  }
  error(event: string, fields: LogFields = {}) {
    this.lines.push({ event, fields });
  }
}

function moduleWith(randomToken: () => string, logger: Logger = new CapturingLogger()) {
  return createIdentityModule({
    identities: publicRepo,
    privateIdentities: repo.asPort(),
    crypto: { randomToken },
    logger,
  });
}

const realRandom = () => randomBytes(32).toString('base64url');

async function accountWithDefaults() {
  const account = await buildAccount(testDb);
  const ids = await repo.createDefault(tx, {
    accountId: account.accountId,
    username: account.username,
    displayName: account.displayName,
  });
  return { ...account, ...ids };
}

async function buildReview(authorPersonaId: string): Promise<string> {
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic Rahman',
      nameBn: 'ডা. কৃত্রিম রহমান',
      state: 'published',
      nameKey: `synthetic-${newId()}`,
    })
    .returning({ id: doctors.id });
  const reviewId = newId();
  await testDb.insert(reviews).values({
    id: reviewId,
    publicId: newPublicId(),
    authorPersonaId,
    doctorId: doctor!.id,
    kind: 'quick',
    relationship: 'self',
    identityMode: 'anonymous',
    periodYear: 2026,
    periodMonth: 4,
    title: 'A synthetic adversarial experience',
    body: 'Synthetic body.',
    language: 'en',
    state: 'published',
    publishedAt: new Date(),
  });
  return reviewId;
}

async function anonymousIn(accountId: string, reviewId: string): Promise<string> {
  const result = await moduleWith(realRandom).personaFor(tx, {
    accountId,
    reviewId,
    mode: 'anonymous',
  });
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.data.personaId;
}

async function asWorker(statement: string): Promise<unknown> {
  const pool = new Pool({ connectionString: workerUrlForTestDb() });
  try {
    return await pool.query(statement);
  } catch (error) {
    return error;
  } finally {
    await pool.end();
  }
}

describe('U11 adversarial: cross-thread correlation on the real tables (§ 8.1)', () => {
  it('renders two threads of one author with nothing in common but kind and hue 0', async () => {
    const author = await accountWithDefaults();
    const first = await anonymousIn(author.accountId, await buildReview(author.namedPersonaId));
    const second = await anonymousIn(author.accountId, await buildReview(author.namedPersonaId));

    const projections = await moduleWith(realRandom).publicProjections(tx, {
      personaIds: [first, second],
    });

    expect(projections).toHaveLength(2);
    const [one, two] = projections as unknown as [Record<string, unknown>, Record<string, unknown>];
    expect(one.displayName).toMatch(ALIAS);
    expect(two.displayName).toMatch(ALIAS);
    expect(Object.entries(one).filter(([key, value]) => two[key] === value)).toEqual([
      ['kind', 'anonymous'],
      ['avatarHue', 0],
    ]);
    const rendered = JSON.stringify(projections);
    for (const secret of [first, second, author.accountId, author.username, author.displayName]) {
      expect(rendered).not.toContain(secret);
    }
  });
});

describe('U11 adversarial: ownership oracle with forged ids (§ 8.3)', () => {
  it('answers false for every forged or borrowed id, exactly as for an unknown id', async () => {
    const owner = await accountWithDefaults();
    const other = await accountWithDefaults();
    const reviewId = await buildReview(owner.namedPersonaId);
    const anonymous = await anonymousIn(owner.accountId, reviewId);
    const { ownership } = moduleWith(realRandom);
    const ask = (accountId: string, personaId: string) =>
      ownership.ownsPersona(tx, { accountId, personaId });

    const forged: [string, string][] = [
      [other.accountId, anonymous],
      [other.accountId, anonymous.toUpperCase()],
      [other.accountId, ` ${anonymous}`],
      [other.accountId, `{${anonymous}}`],
      [other.accountId, owner.namedPersonaId],
      [other.accountId, reviewId],
      [anonymous, anonymous],
      [reviewId, anonymous],
      [owner.username, anonymous],
      [other.accountId, "x' or '1'='1"],
      [other.accountId, newId()],
    ];
    for (const [accountId, personaId] of forged) {
      expect(await ask(accountId, personaId)).toBe(false);
    }
    expect(await ask(owner.accountId, anonymous)).toBe(true);
    expect(await ask(owner.accountId, anonymous.toUpperCase())).toBe(true);

    const othersIds = await ownership.ownPersonaIds(tx, { accountId: other.accountId });
    expect(othersIds).toHaveLength(2);
    expect(othersIds).not.toContain(anonymous);
    expect(await ownership.ownPersonaIds(tx, { accountId: anonymous })).toEqual([]);
    expect(await ownership.ownPersonaIds(tx, { accountId: owner.username })).toEqual([]);
  });
});

describe('U11 adversarial: the worker cannot reach persona_links (§ 8.3, BR3.7)', () => {
  it('refuses rk_worker every statement on persona_links', async () => {
    const statements = [
      'select account_id from persona_links limit 1',
      'select count(*) from persona_links',
      `insert into persona_links (persona_id, account_id) values ('${newId()}', '${newId()}')`,
      `update persona_links set review_id = null where persona_id = '${newId()}'`,
      `delete from persona_links where persona_id = '${newId()}'`,
      'truncate persona_links',
      'copy persona_links to stdout',
    ];
    for (const statement of statements) {
      const outcome = await asWorker(statement);
      expect(outcome, statement).toBeInstanceOf(Error);
      expect((outcome as Error).message, statement).toMatch(PERMISSION_DENIED);
    }
  });

  it('shows rk_worker no planner statistics of persona_links and no view built on it', async () => {
    await accountWithDefaults();
    await testDb.execute(sql`analyze persona_links`);

    const stats = (await asWorker(
      "select attname, most_common_vals::text from pg_stats where tablename = 'persona_links'",
    )) as { rows: unknown[] };
    expect(stats.rows).toEqual([]);

    const views = await testDb.execute<{ view_name: string }>(sql`
      select view_name from information_schema.view_table_usage
      where table_name = 'persona_links'
    `);
    expect(views.rows).toEqual([]);
  });
});

describe('U11 adversarial: alias exhaustion inside a live transaction (§ 8.4)', () => {
  it('gives internal after 5 taken aliases, writes nothing, logs no account and leaves the transaction usable', async () => {
    const holder = await accountWithDefaults();
    const victim = await accountWithDefaults();
    // 'D' is index 3 of base64url, so every draw is `patient-dddd`.
    const takenAlias = 'patient-dddd';
    const taken = await repo.insertAnonymous(tx, {
      accountId: holder.accountId,
      reviewId: await buildReview(holder.namedPersonaId),
      alias: takenAlias,
    });
    expect(taken.ok || taken.error.code === 'alias_taken').toBe(true);
    const reviewId = await buildReview(victim.namedPersonaId);
    const logger = new CapturingLogger();
    let draws = 0;
    const exhausted = moduleWith(() => {
      draws += 1;
      return 'D'.repeat(43);
    }, logger);

    const committed = await testDb.transaction(async (outer) => {
      const inner = appTxOf(outer);
      const failed = await exhausted.personaFor(inner, {
        accountId: victim.accountId,
        reviewId,
        mode: 'anonymous',
      });
      expect(!failed.ok && failed.error.code).toBe('internal');
      const linked = await outer
        .select()
        .from(personaLinks)
        .where(
          and(eq(personaLinks.accountId, victim.accountId), eq(personaLinks.reviewId, reviewId)),
        );
      expect(linked).toEqual([]);
      const holders = await outer
        .select({ id: personas.id })
        .from(personas)
        .where(eq(personas.displayName, takenAlias));
      expect(holders).toHaveLength(1);
      // The transaction is not aborted: a retry with a real source commits.
      return moduleWith(realRandom).personaFor(inner, {
        accountId: victim.accountId,
        reviewId,
        mode: 'anonymous',
      });
    });

    expect(draws).toBe(5);
    expect(committed.ok).toBe(true);
    const after = await testDb
      .select()
      .from(personaLinks)
      .where(
        and(eq(personaLinks.accountId, victim.accountId), eq(personaLinks.reviewId, reviewId)),
      );
    expect(after).toHaveLength(1);
    const logged = JSON.stringify(logger.lines);
    for (const secret of [victim.accountId, takenAlias, victim.username, reviewId]) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe('U11 adversarial: reaching an alias by name (§ 8.5)', () => {
  it('finds nothing by a live alias, a legacy "Anonymous" row, wildcards or an empty string', async () => {
    const author = await accountWithDefaults();
    const anonymous = await anonymousIn(author.accountId, await buildReview(author.namedPersonaId));
    const [projection] = await publicRepo.byIds(tx, [anonymous]);
    // A worst-case legacy anonymous row that still carries a username.
    await testDb
      .insert(personas)
      .values({ kind: 'anonymous', displayName: 'Anonymous', username: 'Anonymous' });

    for (const username of [projection!.displayName, 'Anonymous', '%', '_%', 'patient-%', '']) {
      expect(await publicRepo.publicIdsByUsername(tx, username), username).toEqual([]);
    }
    expect(await publicRepo.publicIdsByUsername(tx, author.username)).toEqual(
      [author.namedPersonaId, author.pseudonymousPersonaId].sort(),
    );
  });
});

/** A UUIDv7 stamped `aheadMs` past the real clock, as an app host running ahead would mint. */
function uuidV7Ahead(aheadMs: number): string {
  const time = (Date.now() + aheadMs).toString(16).padStart(12, '0');
  const random = randomBytes(10).toString('hex');
  const variant = ((parseInt(random.slice(3, 4), 16) & 0x3) | 0x8).toString(16);
  return `${time.slice(0, 8)}-${time.slice(8)}-7${random.slice(0, 3)}-${variant}${random.slice(4, 7)}-${random.slice(7, 19)}`;
}

describe('U11 adversarial: a rename after app-clock default ids (Step 17 finding c)', () => {
  it('returns the rename as current even when the registration ids sort later', async () => {
    const account = await buildAccount(testDb);
    const ids = await repo.createDefault(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: account.displayName,
      namedPersonaId: uuidV7Ahead(60 * 60 * 1000),
      pseudonymousPersonaId: uuidV7Ahead(60 * 60 * 1000),
    });
    const renamed = await repo.insertNamed(tx, {
      accountId: account.accountId,
      displayName: 'Synthetic Renamed Patient',
      username: account.username,
      avatarHue: null,
    });

    expect(renamed < ids.namedPersonaId).toBe(true);
    const current = await repo.currentOf(tx, account.accountId, 'named');
    expect(current?.id).toBe(renamed);
    expect(current?.displayName).toBe('Synthetic Renamed Patient');
  });
});
