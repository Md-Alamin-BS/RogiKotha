// U22 web integration (plan Step 21, `web-int`): the real container's `review.correct`,
// `getOwnForEdit` and `getHistory` with the Pg repositories against the compose PostgreSQL test
// database. Two corrections racing on one version, another account's anonymous review answering
// like an unknown one, and the persona (never the account) as the version row's actor. Every
// account, doctor and review is synthetic.
//
// Needs `pnpm infra:up` and the repo-root `.env`; runs in group 3 with the other `web-int` files.
import { registerCommand, type CommandRequest } from '@rogikotha/application';
import {
  ANONYMOUS_ACTOR,
  newId,
  newPublicId,
  type Actor,
  type DraftPayloadInput,
} from '@rogikotha/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { WebContainer } from './container';
import { optionalEnv } from './env';

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));

const RUN = Date.now().toString(36);
// Member-added doctor names take letters only, so the run id is spelled in letters.
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 60_000;
const PERIOD = { year: 2025, month: 3 };
const STORY =
  'A synthetic account of a calm visit: the doctor listened, explained each dose slowly and wrote it down.';

let container: WebContainer;
let addressSeq = 0;

interface TestAccount {
  accountId: string;
  /** One actor per account, so the same correlation id comes back in every refusal. */
  actor: Actor;
}

function freshRequest(): CommandRequest {
  addressSeq += 1;
  const address = `198.51.100.${150 + addressSeq}`;
  return {
    headers: new Headers({ 'x-forwarded-for': address }),
    clientAddress: address,
    sessionId: null,
  };
}

function call(actor: Actor) {
  return { actor, request: freshRequest(), ports: container.ports };
}

async function query<T>(text: string, values: unknown[] = []): Promise<T[]> {
  const { getDb } = await import('./db');
  const { rows } = await getDb().$client.query(text, values);
  return rows as T[];
}

async function anAccount(label: string, displayName: string): Promise<TestAccount> {
  const result = await registerCommand.execute(
    {
      email: `review.correct.int+${label}-${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username: `rc_${RUN}_${label}`,
      displayName,
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    },
    call(ANONYMOUS_ACTOR('en', newId())),
  );
  if (!result.ok) throw new Error(`register failed: ${result.error.code}`);
  const { accountId } = result.data;
  return {
    accountId,
    actor: {
      kind: 'account',
      accountId,
      emailVerified: true,
      status: 'active',
      capabilities: [],
      locale: 'en',
      correlationId: newId(),
    },
  };
}

async function publishedId(
  account: TestAccount,
  payload: DraftPayloadInput,
  identityMode: 'named' | 'pseudonymous' | 'anonymous',
): Promise<string> {
  const saved = await container.review.saveDraft.execute(
    { payload: { ...payload, identityMode } },
    call(account.actor),
  );
  if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
  const published = await container.review.publish.execute(
    { draftId: saved.data.draftId, identityMode, attestation: true },
    call(account.actor),
  );
  if (!published.ok) throw new Error(`publish failed: ${published.error.code}`);
  return published.data.publicId;
}

function quickDraft(extra: DraftPayloadInput): DraftPayloadInput {
  return {
    target: 'doctor',
    mode: 'quick',
    relationship: 'self',
    period: PERIOD,
    story: STORY,
    notSure: true,
    ...extra,
  };
}

function correction(publicId: string, expectedVersion: number, story: string) {
  return {
    publicId,
    expectedVersion,
    title: 'A corrected synthetic title',
    content: { kind: 'quick', story },
    claims: [],
  };
}

let author: TestAccount;
let other: TestAccount;
let doctorPublicId: string;

beforeAll(async () => {
  // The container reads DATABASE_URL; point it at the integration database before it is built.
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  for (const method of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => undefined);
  }
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  container = (await import('./container')).getContainer();
  author = await anAccount('author', 'Rina Demo');
  other = await anAccount('other', 'Tariq Demo');
  const first = await publishedId(
    other,
    quickDraft({
      title: 'A synthetic visit that adds the doctor',
      newDoctor: { name: `Dr. Synthetic Corrector ${RUN_LETTERS}` },
    }),
    'named',
  );
  const page = await container.review.getExperience.execute(
    { publicId: first },
    call(ANONYMOUS_ACTOR('en', newId())),
  );
  if (!page.ok) throw new Error(`getExperience failed: ${page.error.code}`);
  doctorPublicId = page.data.doctor.publicId;
}, SLOW);

afterAll(async () => {
  vi.restoreAllMocks();
  const { getDb } = await import('./db');
  await getDb().$client.end();
});

describe('correcting through getContainer().review (U22)', () => {
  it(
    'lets exactly one of two corrections on the same version win; the other is a conflict',
    async () => {
      const publicId = await publishedId(author, quickDraft({ doctorPublicId }), 'named');

      const [first, second] = await Promise.all([
        container.review.correct.execute(
          correction(publicId, 1, `${STORY} First writer's addition.`),
          call(author.actor),
        ),
        container.review.correct.execute(
          correction(publicId, 1, `${STORY} Second writer's addition.`),
          call(author.actor),
        ),
      ]);

      const results = [first, second];
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      const refused = results.find((r) => !r.ok);
      expect(refused).toMatchObject({ ok: false, error: { code: 'conflict' } });
      const [row] = await query<{ version: number }>(
        'select version from reviews where public_id = $1',
        [publicId],
      );
      expect(row?.version).toBe(2);
      const versions = await query<{ n: string }>(
        `select count(*) as n from review_versions v join reviews r on r.id = v.review_id
         where r.public_id = $1 and v.change_kind = 'correction'`,
        [publicId],
      );
      expect(Number(versions[0]?.n)).toBe(1);
    },
    SLOW,
  );

  it(
    "answers another account's anonymous review exactly like one that does not exist",
    async () => {
      const real = await publishedId(author, quickDraft({ doctorPublicId }), 'anonymous');
      const forged = newPublicId();

      const editReal = await container.review.getOwnForEdit.execute(
        { publicId: real },
        call(other.actor),
      );
      const editForged = await container.review.getOwnForEdit.execute(
        { publicId: forged },
        call(other.actor),
      );
      const correctReal = await container.review.correct.execute(
        correction(real, 1, `${STORY} An attempted change by someone else.`),
        call(other.actor),
      );
      const correctForged = await container.review.correct.execute(
        correction(forged, 1, `${STORY} An attempted change by someone else.`),
        call(other.actor),
      );

      expect(editReal).toMatchObject({ ok: false, error: { code: 'not_found' } });
      expect(editReal).toEqual(editForged);
      expect(correctReal).toMatchObject({ ok: false, error: { code: 'not_found' } });
      expect(correctReal).toEqual(correctForged);
      const [row] = await query<{ version: number }>(
        'select version from reviews where public_id = $1',
        [real],
      );
      expect(row?.version).toBe(1);
    },
    SLOW,
  );

  it(
    "shows another account's anonymous review's history without versions, persona or account, and an unknown id as not found",
    async () => {
      const real = await publishedId(author, quickDraft({ doctorPublicId }), 'anonymous');
      const edited = await container.review.correct.execute(
        correction(real, 1, `${STORY} The author adds one more sentence.`),
        call(author.actor),
      );
      expect(edited).toMatchObject({ ok: true, data: { changed: true, version: 2 } });
      const [persona] = await query<{ author_persona_id: string }>(
        'select author_persona_id from reviews where public_id = $1',
        [real],
      );

      const asOther = await container.review.getHistory.execute(
        { reviewPublicId: real },
        call(other.actor),
      );
      const signedOut = await container.review.getHistory.execute(
        { reviewPublicId: real },
        call(ANONYMOUS_ACTOR('en', newId())),
      );
      const asAuthor = await container.review.getHistory.execute(
        { reviewPublicId: real },
        call(author.actor),
      );
      const unknown = await container.review.getHistory.execute(
        { reviewPublicId: newPublicId() },
        call(other.actor),
      );

      if (!asOther.ok || !signedOut.ok || !asAuthor.ok) throw new Error('history was refused');
      expect(asOther.data.corrections).toHaveLength(1);
      expect(asOther.data.corrections[0]?.original.story).toBe(STORY);
      expect(asOther.data).not.toHaveProperty('versions');
      expect(signedOut.data).toEqual(asOther.data);
      expect(asAuthor.data.versions?.map((v) => v.version)).toEqual([2, 1]);
      for (const history of [asOther.data, signedOut.data, asAuthor.data]) {
        const text = JSON.stringify(history);
        expect(text).not.toContain(persona?.author_persona_id ?? 'unreachable');
        expect(text).not.toContain(author.accountId);
      }
      expect(unknown).toMatchObject({ ok: false, error: { code: 'not_found' } });
    },
    SLOW,
  );

  it(
    "writes the author's persona, never the account, as the correction version's actor",
    async () => {
      const publicId = await publishedId(author, quickDraft({ doctorPublicId }), 'anonymous');

      const result = await container.review.correct.execute(
        correction(publicId, 1, `${STORY} A sentence added by the author.`),
        call(author.actor),
      );

      expect(result).toMatchObject({ ok: true, data: { version: 2, changed: true } });
      const rows = await query<{ actor_id: string; actor_kind: string; persona: string }>(
        `select v.actor_id, v.actor_kind, r.author_persona_id as persona
           from review_versions v join reviews r on r.id = v.review_id
          where r.public_id = $1 and v.change_kind = 'correction'`,
        [publicId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ actor_kind: 'author' });
      expect(rows[0]?.actor_id).toBe(rows[0]?.persona);
      expect(rows[0]?.actor_id).not.toBe(author.accountId);
      const profiles = await query<{ id: string }>(
        'select id from account_profiles where id = $1',
        [rows[0]?.actor_id],
      );
      expect(profiles).toEqual([]);
    },
    SLOW,
  );
});
