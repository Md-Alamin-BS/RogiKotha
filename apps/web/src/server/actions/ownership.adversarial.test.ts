// @vitest-environment node
// Adversarial tests (plan Step 13): a signed-in attacker forges another account's ids into the
// write actions, and a visitor without a usable session calls them directly. Unlike the action
// tests, the real `server/auth/session.ts` and `getActor()` run here; only the container's session
// lookup and profile read are stubbed.
// The data layer is an in-memory world that grants a write only to the account id it is handed,
// so an action that trusted a forged id would change the victim's rows and fail these tests.
import { defineCommand } from '@rogikotha/application';
import {
  CorrectReviewInput,
  DeleteCommentInput,
  GetForAuthorInput,
  PostCommentInput,
  PublishReviewInput,
  err,
  ok,
  type OwnEvidenceList,
  type DemoCurrentAccount,
  type DemoReviewEditRow,
} from '@rogikotha/contracts';
import { redirect as redirectToSignIn } from '@rogikotha/i18n';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getContainer } from '@/server/container';
import { accounts, reviews, session } from '@/server/data';
import { deleteComment, postComment, type CommentActionState } from './comments';
import { listOwnEvidenceFiles } from './evidence';
import { setLang } from './preferences';
import { updateDisplayNameAction, updateLanguageAction } from './profile';
import { publishDraftAction } from './review';
import { correctReviewAction, type CorrectFormState } from './review-edit';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(() => Promise.resolve('en')) }));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));
vi.mock('@/server/crypto', () => ({
  encrypt: vi.fn(() => Buffer.from('sealed')),
  decryptToString: vi.fn(() => 'scan.png'),
}));
vi.mock('./preferences', () => ({ setLang: vi.fn() }));
vi.mock('@/server/data', () => ({
  accounts: { updateDisplayName: vi.fn(), updateLocale: vi.fn() },
  reviews: {
    getOwnReviewForEdit: vi.fn(),
    getReviewByPublicId: vi.fn(),
  },
  session: { getCurrentAccountByAuthUserId: vi.fn() },
}));

const DOCTOR_ID = '0190f5a2-0000-7000-8000-0000000000d1';
const VICTIM_REVIEW = 'v1ct1mrev1';
const MISSING_REVIEW = 'm1ss1ngrv1';
const VICTIM_COMMENT = 'v1ct1mcmt1';
const MISSING_COMMENT = 'm1ss1ngcm1';
const ORIGINAL_TITLE = 'A calm visit, synthetic';

function buildAccount(name: string, overrides: Partial<DemoCurrentAccount> = {}) {
  return {
    accountId: `0190f5a2-0000-7000-8000-0000000${name.padEnd(5, '0').slice(0, 5)}`,
    authUserId: `auth-${name}`,
    username: `${name}_synthetic`,
    displayName: `${name} synthetic`,
    locale: 'en',
    status: 'active',
    currentPersonaId: `persona-named-${name}`,
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  } satisfies DemoCurrentAccount;
}

const VICTIM = buildAccount('victim');
const ATTACKER = buildAccount('attacker');
const SUSPENDED = buildAccount('suspended', { status: 'suspended' });
const ACCOUNTS_BY_AUTH_USER = new Map<string, DemoCurrentAccount>(
  [VICTIM, ATTACKER, SUSPENDED].map((account) => [account.authUserId, account]),
);

interface World {
  reviews: Map<string, { id: string; ownerAccountId: string; title: string; version: number }>;
  comments: Map<string, { ownerAccountId: string; deleted: boolean }>;
  /** Every write the data layer accepted, in order. */
  writes: string[];
  /** The account each `review.correct` call ran for, accepted or refused. */
  correctAttempts: string[];
}

let world: World;

function freshWorld(): World {
  return {
    reviews: new Map([
      [
        VICTIM_REVIEW,
        { id: 'review-row-1', ownerAccountId: VICTIM.accountId, title: ORIGINAL_TITLE, version: 1 },
      ],
    ]),
    comments: new Map([[VICTIM_COMMENT, { ownerAccountId: VICTIM.accountId, deleted: false }]]),
    writes: [],
    correctAttempts: [],
  };
}

function editRowOf(publicId: string): DemoReviewEditRow {
  const row = world.reviews.get(publicId)!;
  return {
    id: row.id,
    publicId,
    doctorId: DOCTOR_ID,
    title: row.title,
    body: 'A synthetic body that is long enough.',
    sentiment: null,
    outcome: null,
    version: row.version,
  };
}

function installWorld(): void {
  const ownedBy = (publicId: string, accountId: string) =>
    world.reviews.get(publicId)?.ownerAccountId === accountId;

  vi.mocked(reviews.getReviewByPublicId).mockImplementation((publicId) =>
    Promise.resolve(
      world.reviews.has(publicId) ? ({ id: world.reviews.get(publicId)!.id } as never) : null,
    ),
  );
  vi.mocked(reviews.getOwnReviewForEdit).mockImplementation((publicId, accountId) =>
    Promise.resolve(ownedBy(publicId, accountId) ? editRowOf(publicId) : null),
  );
  vi.mocked(accounts.updateDisplayName).mockImplementation((accountId, name) => {
    world.writes.push(`account.rename ${accountId} to ${name}`);
    return Promise.resolve() as never;
  });
  vi.mocked(accounts.updateLocale).mockImplementation((accountId) => {
    world.writes.push(`account.locale ${accountId}`);
    return Promise.resolve();
  });
}

const getSession = vi.fn();
const NOW = new Date('2026-11-04T09:00:00Z');

/** The Better Auth user behind the request's session cookie; null means no cookie at all. */
function sessionCookieOf(authUserId: string | null): void {
  getSession.mockResolvedValue(
    authUserId
      ? {
          sessionId: `session-${authUserId}`,
          authUserId,
          createdAt: NOW,
          updatedAt: NOW,
          expiresAt: new Date(NOW.getTime() + 86_400_000),
        }
      : null,
  );
}

// The module path (U47): `review.publish` on its own input schema and requirements. The persona
// comes from the actor's account inside the module, so the stand-in records that account only.
const modulePublish = defineCommand<PublishReviewInput, { publicId: string }>({
  name: 'review.publish',
  input: PublishReviewInput,
  requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
  handle: ({ actor }) => {
    world.writes.push(`review.publish by ${actor.accountId}`);
    return Promise.resolve(ok({ publicId: 'n3wrev1ew2' }));
  },
});

// U48: the list goes through `evidence.getForAuthor`; this stand-in answers the world's author
// only, so the test still proves the action passes the session's actor and nothing from the form.
const moduleGetForAuthor = defineCommand<GetForAuthorInput, OwnEvidenceList | null>({
  name: 'evidence.getForAuthor',
  input: GetForAuthorInput,
  requires: { authenticated: true, verifiedEmail: true },
  handle: ({ input, actor }) => {
    const review = world.reviews.get(input.reviewPublicId);
    if (review?.ownerAccountId !== actor.accountId) return Promise.resolve(ok(null));
    return Promise.resolve(
      ok({ reviewPublicId: input.reviewPublicId, files: [], maxFiles: 10, maxBytes: 15_728_640 }),
    );
  },
});

// The module path (U22): `review.correct` on its own input schema and requirements. The stand-in
// answers a review that is not the actor's like one that does not exist (BR1.1).
const moduleCorrect = defineCommand<CorrectReviewInput, { publicId: string; version: number }>({
  name: 'review.correct',
  input: CorrectReviewInput,
  requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
  handle: ({ input, actor }) => {
    world.correctAttempts.push(`${input.publicId} by ${actor.accountId}`);
    const row = world.reviews.get(input.publicId);
    if (!row || row.ownerAccountId !== actor.accountId) {
      return Promise.resolve(err('not_found', { correlationId: actor.correlationId }));
    }
    row.title = input.title;
    row.version += 1;
    world.writes.push(`review.correct ${input.publicId} by ${actor.accountId}`);
    return Promise.resolve(ok({ publicId: input.publicId, version: row.version }));
  },
});

// The module path (U49): `comment.post` and `comment.delete` on their own input schemas and
// requirements. The persona and the owner come from the actor's account inside the module, so the
// stand-ins record that account only; a forged form field has nowhere to land.
const moduleCommentPost = defineCommand<PostCommentInput, { publicId: string }>({
  name: 'comment.post',
  input: PostCommentInput,
  requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
  handle: ({ actor, input }) => {
    if (!world.reviews.has(input.reviewPublicId)) {
      return Promise.resolve(err('not_found', { correlationId: actor.correlationId }));
    }
    world.writes.push(`comment.add on ${input.reviewPublicId} by ${actor.accountId}`);
    return Promise.resolve(ok({ publicId: 'n3wcmt0001' }));
  },
});

const moduleCommentDelete = defineCommand<DeleteCommentInput, { placeholder: boolean }>({
  name: 'comment.delete',
  input: DeleteCommentInput,
  requires: { authenticated: true },
  handle: ({ actor, input }) => {
    const row = world.comments.get(input.commentPublicId);
    if (!row || row.deleted || row.ownerAccountId !== actor.accountId) {
      return Promise.resolve(err('not_found', { correlationId: actor.correlationId }));
    }
    row.deleted = true;
    world.writes.push(`comment.delete ${input.commentPublicId} by ${actor.accountId}`);
    return Promise.resolve(ok({ placeholder: false }));
  },
});

/** The container `getActor()` reads: the stubbed session and the world's profiles. */
function installContainer(): void {
  const findProfileByAuthUserId = (_tx: unknown, authUserId: string) => {
    const account = ACCOUNTS_BY_AUTH_USER.get(authUserId);
    return Promise.resolve(
      account
        ? {
            accountId: account.accountId,
            authUserId: account.authUserId,
            username: account.username,
            displayName: account.displayName,
            locale: account.locale,
            status: account.status,
          }
        : null,
    );
  };
  vi.mocked(getContainer).mockReturnValue({
    env: { appMode: 'demo' },
    ports: {
      authGateway: { getSession, revokeSession: vi.fn(() => Promise.resolve()) },
      accounts: { findProfileByAuthUserId },
      unitOfWork: {
        read: (work: (tx: unknown) => unknown) => work({}),
        run: (work: (tx: unknown) => unknown) => work({}),
      },
      clock: { now: () => NOW },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    },
    review: { publish: modulePublish, correct: moduleCorrect },
    evidence: { getForAuthor: moduleGetForAuthor },
    community: { postComment: moduleCommentPost, deleteComment: moduleCommentDelete },
  } as unknown as ReturnType<typeof getContainer>);
}

function form(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const IDLE_COMMENT: CommentActionState = { status: 'idle' };
const EDIT_START: CorrectFormState = { attempt: 0, values: null, fieldErrors: {}, formError: null };

/** The victim's ids, as an attacker would add them to any form. */
const FORGED_IDS = {
  accountId: VICTIM.accountId,
  authorAccountId: VICTIM.accountId,
  ownerAccountId: VICTIM.accountId,
  authorPersonaId: VICTIM.currentPersonaId,
  authUserId: VICTIM.authUserId,
};

/** A `publishDraftAction` request for a synthetic draft id. */
const PUBLISH_DRAFT = {
  draftId: '0190f5a2-0000-7000-8000-0000000000f1',
  identityMode: 'named',
  attestation: true,
};

function editForm(publicId: string): FormData {
  return form({
    ...FORGED_IDS,
    publicId,
    expectedVersion: '1',
    kind: 'quick',
    title: 'Hijacked title',
    story: 'This text was written by someone who is not the author.',
    sentiment: 'negative',
    outcome: '',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  world = freshWorld();
  installWorld();
  vi.mocked(headers).mockResolvedValue(new Headers({ cookie: 'rk.session_token=forged' }));
  installContainer();
  vi.mocked(session.getCurrentAccountByAuthUserId).mockImplementation((authUserId) =>
    Promise.resolve(ACCOUNTS_BY_AUTH_USER.get(authUserId) ?? null),
  );
});

describe('an attacker signed in as another account (FR4.2, FR5.1, FR6.3, NFR3)', () => {
  beforeEach(() => sessionCookieOf(ATTACKER.authUserId));

  it("cannot correct the victim's experience by sending its public id, even with the victim's ids forged into the form", async () => {
    const state = await correctReviewAction(EDIT_START, editForm(VICTIM_REVIEW));

    expect(state.formError).toBe('errors.common.notFound');
    expect(world.reviews.get(VICTIM_REVIEW)).toMatchObject({ title: ORIGINAL_TITLE, version: 1 });
    expect(world.writes).toEqual([]);
    expect(world.correctAttempts).toEqual([`${VICTIM_REVIEW} by ${ATTACKER.accountId}`]);
  });

  it("gets the same answer for the victim's experience as for one that does not exist", async () => {
    const victims = await correctReviewAction(EDIT_START, editForm(VICTIM_REVIEW));
    const missing = await correctReviewAction(EDIT_START, editForm(MISSING_REVIEW));

    expect(victims).toEqual(missing);
  });

  it("cannot delete the victim's comment, and the refusal reads exactly like an unknown comment", async () => {
    const victims = await deleteComment(
      IDLE_COMMENT,
      form({ ...FORGED_IDS, reviewPublicId: VICTIM_REVIEW, commentPublicId: VICTIM_COMMENT }),
    );
    const missing = await deleteComment(
      IDLE_COMMENT,
      form({ reviewPublicId: VICTIM_REVIEW, commentPublicId: MISSING_COMMENT }),
    );

    expect(victims).toEqual({ status: 'error', messageKey: 'errors.common.notFound' });
    expect(victims).toEqual(missing);
    expect(world.comments.get(VICTIM_COMMENT)?.deleted).toBe(false);
    expect(world.writes).toEqual([]);
  });

  it("cannot comment under the victim's persona by forging it into the form", async () => {
    await postComment(
      IDLE_COMMENT,
      form({ ...FORGED_IDS, reviewPublicId: VICTIM_REVIEW, body: 'A synthetic reply' }),
    );

    expect(world.writes).toEqual([`comment.add on ${VICTIM_REVIEW} by ${ATTACKER.accountId}`]);
  });

  it("cannot publish under the victim's persona through the review module by forging it into the request", async () => {
    const forged = await publishDraftAction({
      ...PUBLISH_DRAFT,
      ...FORGED_IDS,
      personaId: VICTIM.currentPersonaId,
    });
    await expect(publishDraftAction(PUBLISH_DRAFT)).rejects.toThrow('NEXT_REDIRECT');

    expect(forged.formError).toBe('errors.common.validation');
    expect(world.writes).toEqual([`review.publish by ${ATTACKER.accountId}`]);
  });

  it("cannot list the victim's files, and nothing is written", async () => {
    await expect(listOwnEvidenceFiles(VICTIM_REVIEW)).resolves.toBeNull();
    expect(world.writes).toEqual([]);
  });

  it('can rename only their own account, whatever account id the form names', async () => {
    await updateDisplayNameAction(
      { status: 'idle' },
      form({ ...FORGED_IDS, displayName: 'Renamed by someone else' }),
    );

    expect(world.writes).toEqual([
      `account.rename ${ATTACKER.accountId} to Renamed by someone else`,
    ]);
  });
});

const COMMENT_ACTIONS = [
  [
    'post a comment',
    () => postComment(IDLE_COMMENT, form({ reviewPublicId: VICTIM_REVIEW, body: 'Hello there' })),
  ],
  [
    'delete a comment',
    () =>
      deleteComment(
        IDLE_COMMENT,
        form({ reviewPublicId: VICTIM_REVIEW, commentPublicId: VICTIM_COMMENT }),
      ),
  ],
] as const;

const WRITE_ACTIONS = [
  ['correct an experience', () => correctReviewAction(EDIT_START, editForm(VICTIM_REVIEW))],
  [
    'rename the account',
    () => updateDisplayNameAction({ status: 'idle' }, form({ displayName: 'New name' })),
  ],
  ['change the language', () => updateLanguageAction({ status: 'idle' }, form({ locale: 'bn' }))],
] as const;

describe.each([
  ['with no session cookie', null],
  ['with the live session of a suspended account', SUSPENDED.authUserId],
  ['with a session whose Better Auth user has no profile', 'auth-orphan'],
])('a visitor %s (FR1, NFR3)', (_kind, authUserId) => {
  beforeEach(() => sessionCookieOf(authUserId));

  it.each(WRITE_ACTIONS)('is sent to sign in and cannot %s', async (_name, act) => {
    await expect(act()).rejects.toThrow('NEXT_REDIRECT');

    const [call] = vi.mocked(redirectToSignIn).mock.calls;
    const href = call?.[0].href;
    expect(typeof href === 'string' ? href : href?.pathname).toBe('/sign-in');
    expect(world.writes).toEqual([]);
    expect(setLang).not.toHaveBeenCalled();
  });

  // U49: the comment actions have no sign-in redirect of their own; the module refuses (BR1.1) and
  // the contribution gate in front of the form is what sends a visitor to sign in.
  it.each(COMMENT_ACTIONS)('is refused as forbidden and cannot %s', async (_name, act) => {
    const state = await act();

    expect(state).toMatchObject({ status: 'error', messageKey: 'errors.common.forbidden' });
    expect(world.writes).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('cannot publish a draft through the review module, and nothing is written', async () => {
    const state = await publishDraftAction(PUBLISH_DRAFT);

    expect(state).toEqual({ formError: 'errors.common.forbidden', fieldErrors: {} });
    expect(world.writes).toEqual([]);
  });
});

describe('a review id in the comment form that is forged into an address', () => {
  it('is refused with nothing written and no page refreshed, signed in or not', async () => {
    for (const authUserId of [null, ATTACKER.authUserId]) {
      sessionCookieOf(authUserId);
      const state = await postComment(
        IDLE_COMMENT,
        form({ reviewPublicId: '//evil.example', body: 'Hello there' }),
      );

      expect(state.status).toBe('error');
      expect(world.writes).toEqual([]);
      expect(revalidatePath).not.toHaveBeenCalled();
    }
  });
});
