// U47 web integration (plan Step 38, `web-int`): the real container's review module, Identity,
// Directory and Taxonomy seams and Pg repositories against the compose PostgreSQL test database.
// Publish and read back, a rolled-back publish, the anonymous new-doctor refusal (BR3.12) and the
// anonymity checks of functional-spec § 10. Every account, doctor and tag is synthetic.
//
// Needs `pnpm infra:up` and the repo-root `.env`; runs in group 3 with the other `web-int` files.
import { registerCommand, type CommandRequest } from '@rogikotha/application';
import {
  ANONYMOUS_ACTOR,
  newId,
  type Actor,
  type DraftPayloadInput,
  type ExperiencePageVM,
} from '@rogikotha/contracts';
import { PgReviewModuleRepository } from '@rogikotha/database';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { WebContainer } from './container';
import { optionalEnv } from './env';

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));

const RUN = Date.now().toString(36);
// Member-added doctor names and tag texts take letters only, so the run id is spelled in letters.
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 60_000;
const PERIOD = { year: 2025, month: 3 };
const STORY =
  'A synthetic account of a calm visit: the doctor listened, explained each dose slowly and wrote it down.';

let container: WebContainer;
let addressSeq = 0;
const consoleLines: unknown[][] = [];

interface TestAccount {
  accountId: string;
  username: string;
  actor: () => Actor;
}

function freshRequest(): CommandRequest {
  addressSeq += 1;
  const address = `198.51.100.${100 + addressSeq}`;
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

async function countOf(text: string, values: unknown[] = []): Promise<number> {
  const [row] = await query<{ n: string }>(text, values);
  return Number(row?.n ?? 0);
}

/** A registered account; the commands take the confirmed, active actor built from its id. */
async function anAccount(label: string, displayName: string): Promise<TestAccount> {
  const username = `rv_${RUN}_${label}`;
  const result = await registerCommand.execute(
    {
      email: `review.int+${label}-${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username,
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
    username,
    actor: () => ({
      kind: 'account',
      accountId,
      emailVerified: true,
      status: 'active',
      capabilities: [],
      locale: 'en',
      correlationId: newId(),
    }),
  };
}

async function saveDraft(account: TestAccount, payload: DraftPayloadInput): Promise<string> {
  const saved = await container.review.saveDraft.execute({ payload }, call(account.actor()));
  if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
  return saved.data.draftId;
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

async function publish(
  account: TestAccount,
  payload: DraftPayloadInput,
  identityMode: 'named' | 'pseudonymous' | 'anonymous',
) {
  const draftId = await saveDraft(account, { ...payload, identityMode });
  return container.review.publish.execute(
    { draftId, identityMode, attestation: true },
    call(account.actor()),
  );
}

async function publishedId(
  account: TestAccount,
  payload: DraftPayloadInput,
  identityMode: 'named' | 'pseudonymous' | 'anonymous',
): Promise<string> {
  const result = await publish(account, payload, identityMode);
  if (!result.ok) throw new Error(`publish failed: ${result.error.code}`);
  return result.data.publicId;
}

async function experience(publicId: string): Promise<ExperiencePageVM> {
  const page = await container.review.getExperience.execute(
    { publicId },
    call(ANONYMOUS_ACTOR('en', newId())),
  );
  if (!page.ok) throw new Error(`getExperience failed: ${page.error.code}`);
  return page.data;
}

function relatedIds(page: ExperiencePageVM): string[] {
  return [...page.relatedByCondition, ...page.sameDoctor, ...page.otherByAuthor].map(
    (card) => card.publicId,
  );
}

const DOCTOR_X = `Dr. Synthetic Xavier ${RUN_LETTERS}`;
const DOCTOR_Y = `Dr. Synthetic Yasmin ${RUN_LETTERS}`;

let shirin: TestAccount;
let karim: TestAccount;
let doctorX: string;
let doctorY: string;

beforeAll(async () => {
  // The container reads DATABASE_URL; point it at the integration database before it is built.
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  for (const method of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args);
    });
  }
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    consoleLines.push([String(chunk)]);
    return true;
  });
  container = (await import('./container')).getContainer();
  shirin = await anAccount('shirin', 'Shirin Demo');
  karim = await anAccount('karim', 'Karim Demo');
}, SLOW);

afterAll(async () => {
  vi.restoreAllMocks();
  const { getDb } = await import('./db');
  await getDb().$client.end();
});

describe('publishing through getContainer().review (WF4)', () => {
  it(
    'publishes a quick review about a doctor the author adds and reads it back',
    async () => {
      const publicId = await publishedId(
        shirin,
        quickDraft({ title: 'A calm synthetic visit', newDoctor: { name: DOCTOR_X } }),
        'named',
      );

      const page = await experience(publicId);
      expect(page).toMatchObject({
        publicId,
        reviewKind: 'quick',
        title: 'A calm synthetic visit',
        story: STORY,
        relationship: 'self',
        period: PERIOD,
        byline: { personaKind: 'named', displayName: 'Shirin Demo' },
        doctor: { name: DOCTOR_X, memberAddedNotConfirmed: true },
        otherByAuthor: [],
      });
      doctorX = page.doctor.publicId;
      const [draftsLeft] = await query<{ n: string }>(
        'select count(*) as n from review_drafts where account_id = $1',
        [shirin.accountId],
      );
      expect(Number(draftsLeft?.n)).toBe(0);
    },
    SLOW,
  );

  it(
    'rolls a failed publish back whole: no persona, term, doctor or review is left',
    async () => {
      const doctorName = `Dr. Synthetic Zahid ${RUN_LETTERS}`;
      const tagText = `Synthetic rollback symptom ${RUN_LETTERS}`;
      const anonTagText = `Synthetic anonymous symptom ${RUN_LETTERS}`;
      const personasBefore = await countOf('select count(*) as n from personas');
      const reviewsBefore = await countOf('select count(*) as n from reviews');
      const deleteDraft = vi
        .spyOn(PgReviewModuleRepository.prototype, 'deleteOwnDraft')
        .mockRejectedValue(new Error('synthetic failure at the last step'));

      try {
        const named = await publish(
          shirin,
          quickDraft({
            newDoctor: { name: doctorName },
            notSure: false,
            tags: [{ group: 'symptom', text: tagText }],
          }),
          'named',
        );
        // The anonymous mode creates its thread persona inside the publish transaction.
        const anonymous = await publish(
          karim,
          quickDraft({
            doctorPublicId: doctorX,
            notSure: false,
            tags: [{ group: 'symptom', text: anonTagText }],
          }),
          'anonymous',
        );

        expect(named).toMatchObject({ ok: false, error: { code: 'internal' } });
        expect(anonymous).toMatchObject({ ok: false, error: { code: 'internal' } });
        expect(deleteDraft).toHaveBeenCalledTimes(2);
      } finally {
        deleteDraft.mockRestore();
      }

      expect(
        await countOf('select count(*) as n from doctors where name_en = $1 or name_bn = $1', [
          doctorName,
        ]),
      ).toBe(0);
      expect(
        await countOf(
          'select count(*) as n from taxonomy_terms where name_en = any($1) or name_bn = any($1)',
          [[tagText, anonTagText]],
        ),
      ).toBe(0);
      expect(await countOf('select count(*) as n from personas')).toBe(personasBefore);
      expect(
        await countOf(
          `select count(*) as n from persona_links where account_id = $1 and review_id is not null`,
          [karim.accountId],
        ),
      ).toBe(0);
      expect(await countOf('select count(*) as n from reviews')).toBe(reviewsBefore);
      // BR2.5: a failed publish keeps both drafts.
      expect(
        await countOf('select count(*) as n from review_drafts where account_id = any($1)', [
          [shirin.accountId, karim.accountId],
        ]),
      ).toBe(2);
    },
    SLOW,
  );
});

describe('anonymity (BR3.12, functional-spec § 10)', () => {
  it(
    'refuses an anonymous review that adds a doctor and changes no submission, doctor, review or persona',
    async () => {
      const tables = ['profile_submissions', 'doctors', 'reviews', 'persona_links'] as const;
      const before = await Promise.all(
        tables.map((table) => countOf(`select count(*) as n from ${table}`)),
      );

      const result = await publish(
        karim,
        quickDraft({ newDoctor: { name: `Dr. Synthetic Wahid ${RUN_LETTERS}` } }),
        'anonymous',
      );

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: 'review.anonymous_new_doctor',
          fieldErrors: { identity: 'errors.review.anonymousNewDoctor' },
        },
      });
      const after = await Promise.all(
        tables.map((table) => countOf(`select count(*) as n from ${table}`)),
      );
      expect(after).toEqual(before);
    },
    SLOW,
  );

  it(
    "keeps two anonymous reviews by one account apart: own aliases, not on the author page, not in each other's lists",
    async () => {
      const second = await publishedId(
        shirin,
        quickDraft({ newDoctor: { name: DOCTOR_Y } }),
        'named',
      );
      doctorY = (await experience(second)).doctor.publicId;
      const namedByKarim = await publishedId(
        karim,
        quickDraft({ doctorPublicId: doctorX }),
        'named',
      );
      const anonA = await publishedId(karim, quickDraft({ doctorPublicId: doctorX }), 'anonymous');
      const anonB = await publishedId(karim, quickDraft({ doctorPublicId: doctorY }), 'anonymous');

      const [pageA, pageB] = await Promise.all([experience(anonA), experience(anonB)]);
      expect(pageA.byline.personaKind).toBe('anonymous');
      expect(pageB.byline.personaKind).toBe('anonymous');
      expect(pageA.byline.alias).toEqual(expect.any(String));
      expect(pageB.byline.alias).toEqual(expect.any(String));
      expect(pageA.byline.alias).not.toBe(pageB.byline.alias);
      expect(pageA.otherByAuthor).toEqual([]);
      expect(pageB.otherByAuthor).toEqual([]);
      expect(relatedIds(pageA)).not.toContain(anonB);
      expect(relatedIds(pageB)).not.toContain(anonA);

      const authorPage = await container.review.authorCards.execute(
        { username: karim.username },
        call(ANONYMOUS_ACTOR('en', newId())),
      );
      expect(authorPage.ok).toBe(true);
      const onAuthorPage = authorPage.ok ? authorPage.data.page.items.map((c) => c.publicId) : [];
      expect(onAuthorPage).toContain(namedByKarim);
      expect(onAuthorPage).not.toContain(anonA);
      expect(onAuthorPage).not.toContain(anonB);
    },
    SLOW,
  );

  // ASSUMPTION(U47): BR3.12 read as "no submission names the author of an anonymous review": an
  // anonymous review of a member-added doctor by another account is allowed, so the check joins
  // the submitting account to the anonymous review's persona link.
  it('has no profile submission whose created doctor carries an anonymous review by its submitter', async () => {
    expect(
      await countOf(
        `select count(*) as n
           from profile_submissions ps
           join reviews r on r.doctor_id = ps.created_doctor_id and r.identity_mode = 'anonymous'
           join persona_links pl on pl.persona_id = r.author_persona_id
          where pl.account_id = ps.submitted_by_account_id`,
      ),
    ).toBe(0);
    // This run did submit doctors, so the join above is not empty for want of rows.
    expect(
      await countOf(
        'select count(*) as n from profile_submissions where submitted_by_account_id = $1',
        [shirin.accountId],
      ),
    ).toBeGreaterThan(0);
  });
});
