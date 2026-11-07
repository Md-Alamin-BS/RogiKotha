// @vitest-environment node
// The U47 actions run the real `runCommand` against a stand-in review module whose commands are
// built with `defineCommand` on the module's own input schemas and requirements, so parsing and
// authorization are real and every accepted write is recorded by the account that made it.
import type * as ApplicationModule from '@rogikotha/application';
import {
  defineCommand,
  defineQuery,
  type Command,
  type ReviewModule,
} from '@rogikotha/application';
import {
  DiscardDraftInput,
  HasOwnReviewOfDoctorInput,
  PreviewDraftInput,
  PublishReviewInput,
  SaveDraftInput,
  err,
  ok,
  type Actor,
  type ErrorCode,
  type Result,
} from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from '@/i18n/routing';
import { getRequestContext } from '@/server/auth';
import { getContainer } from '@/server/container';
import {
  discardDraftAction,
  duplicateHintAction,
  previewAction,
  publishDraftAction,
  publishFacilityVisitAction,
  saveDraftAction,
} from './review';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));
vi.mock('@rogikotha/application', async (importOriginal) => {
  const original = await importOriginal<typeof ApplicationModule>();
  const contracts = await import('@rogikotha/contracts');
  return {
    ...original,
    getOwnAccountQuery: original.defineQuery({
      name: 'account.getOwnAccount',
      input: contracts.GetOwnAccountInput,
      requires: { authenticated: true },
      handle: () =>
        Promise.resolve(
          contracts.ok({
            username: 'abba_of_two',
            displayName: 'Abba of Two',
            emailVerified: true,
            emailMasked: 'a****@example.test',
          }),
        ),
    }),
  };
});
vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

// The edit rows (the author's correction, another account's review, a malformed id, a signed-out
// save, a refused field) moved to review-edit.test.ts with `correctReviewAction` (U22).
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLocale).mockResolvedValue('en');
});

const ACCOUNT_ID = '0190f5a2-0000-7000-8000-000000000001';
const VICTIM_PERSONA_ID = '0190f5a2-0000-7000-8000-0000000000bb';
const DRAFT_ID = '0190f5a2-0000-7000-8000-0000000000f1';
const NEW_PUBLIC_ID = 'n3wrev1ew1';
const BRANCH_PUBLIC_ID = 'br4nch0001';

function anAccountActor(overrides: Partial<Actor> = {}): Actor {
  return {
    kind: 'account',
    accountId: ACCOUNT_ID,
    personaId: '0190f5a2-0000-7000-8000-0000000000aa',
    emailVerified: true,
    status: 'active',
    capabilities: [],
    locale: 'en',
    correlationId: '0190f5a2-0000-7000-8000-0000000000c1',
    ...overrides,
  };
}

const SIGNED_OUT: Actor = {
  kind: 'anonymous',
  capabilities: [],
  locale: 'en',
  correlationId: '0190f5a2-0000-7000-8000-0000000000c2',
};

/** Every write the stand-in module accepted, with the account it ran for. */
let writes: string[];
/** A refusal the next call of a command answers with, after authorization. */
let scripted: Partial<Record<string, Result<never>>>;
/** The parsed inputs each command handled. */
let handled: Record<string, unknown[]>;

function refusalFor(code: ErrorCode, fieldErrors?: Record<string, string>): Result<never> {
  return err(code, { correlationId: 'c', ...(fieldErrors ? { fieldErrors } : {}) });
}

interface StandInRequires {
  authenticated: true;
  verifiedEmail: true;
  notRestricted?: true;
}

function standIn<I, O>(
  kind: 'command' | 'query',
  name: string,
  input: Command<I, O>['input'],
  requires: StandInRequires,
  answer: O,
): Command<I, O> {
  const handle = ({ input: parsed, actor }: { input: I; actor: Actor }): Promise<Result<O>> => {
    (handled[name] ??= []).push(parsed);
    const refusal = scripted[name];
    if (refusal) return Promise.resolve(refusal);
    if (kind === 'command') writes.push(`${name} by ${actor.accountId}`);
    return Promise.resolve(ok(answer));
  };
  return kind === 'command'
    ? defineCommand<I, O>({ name, input, requires, handle })
    : defineQuery<I, O>({ name, input, requires, handle });
}

const PUBLISH_REQUIRES: StandInRequires = {
  authenticated: true,
  verifiedEmail: true,
  notRestricted: true,
};
const DRAFT_REQUIRES: StandInRequires = { authenticated: true, verifiedEmail: true };
const PREVIEW = { kind: 'preview' } as never;

function aReviewModule(): Partial<ReviewModule> {
  return {
    saveDraft: standIn('command', 'review.saveDraft', SaveDraftInput, DRAFT_REQUIRES, {
      draftId: DRAFT_ID,
      expiresAt: '2026-12-06T09:00:00.000Z',
    }),
    discardDraft: standIn('command', 'review.discardDraft', DiscardDraftInput, DRAFT_REQUIRES, {}),
    preview: standIn('query', 'review.preview', PreviewDraftInput, DRAFT_REQUIRES, PREVIEW),
    hasOwnReviewOfDoctor: standIn(
      'query',
      'review.hasOwnReviewOfDoctor',
      HasOwnReviewOfDoctorInput,
      DRAFT_REQUIRES,
      { duplicate: true },
    ),
    publish: standIn('command', 'review.publish', PublishReviewInput, PUBLISH_REQUIRES, {
      publicId: NEW_PUBLIC_ID,
    }),
    facilityReviewPublish: standIn(
      'command',
      'facilityReview.publish',
      PublishReviewInput,
      PUBLISH_REQUIRES,
      { publicId: 'f4c1l1ty01', branchPublicId: BRANCH_PUBLIC_ID },
    ),
  };
}

function signInAs(actor: Actor): void {
  vi.mocked(getRequestContext).mockResolvedValue({
    actor,
    session: null,
    request: { headers: new Headers(), clientAddress: null, sessionId: null },
  });
}

const PUBLISH = { draftId: DRAFT_ID, identityMode: 'named', attestation: true };

describe('the review module actions (U47, WF2-WF5)', () => {
  beforeEach(() => {
    writes = [];
    scripted = {};
    handled = {};
    vi.mocked(getContainer).mockReturnValue({
      ports: {
        unitOfWork: {
          run: (work: (tx: unknown) => unknown) => work({}),
          read: (work: (tx: unknown) => unknown) => work({}),
        },
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
      review: aReviewModule(),
    } as unknown as ReturnType<typeof getContainer>);
    signInAs(anAccountActor());
  });

  describe('saveDraftAction', () => {
    it('saves the draft for the signed-in account and answers its id and expiry', async () => {
      const answer = await saveDraftAction({ payload: { title: 'A calm visit' } });

      expect(answer).toEqual({
        ok: true,
        draftId: DRAFT_ID,
        expiresAt: '2026-12-06T09:00:00.000Z',
      });
      expect(writes).toEqual([`review.saveDraft by ${ACCOUNT_ID}`]);
    });

    it('answers the rate limit with its message key and the wait', async () => {
      scripted['review.saveDraft'] = err('rate_limited', { correlationId: 'c', retryAfterSec: 90 });

      await expect(saveDraftAction({ payload: {} })).resolves.toEqual({
        ok: false,
        messageKey: 'errors.common.rateLimited',
        retryAfterSec: 90,
      });
    });

    it('refuses a signed-out visitor and writes nothing', async () => {
      signInAs(SIGNED_OUT);

      const answer = await saveDraftAction({ payload: {} });

      expect(answer).toEqual({ ok: false, messageKey: 'errors.common.forbidden' });
      expect(writes).toEqual([]);
    });

    it('refuses an account id forged into the request and writes nothing', async () => {
      const answer = await saveDraftAction({ payload: {}, accountId: 'someone-else' });

      expect(answer).toMatchObject({ ok: false, messageKey: 'errors.common.validation' });
      expect(writes).toEqual([]);
    });
  });

  describe('discardDraftAction', () => {
    it('discards the draft and refreshes the write page in both languages', async () => {
      await expect(discardDraftAction({ draftId: DRAFT_ID })).resolves.toEqual({ ok: true });

      expect(writes).toEqual([`review.discardDraft by ${ACCOUNT_ID}`]);
      expect(revalidatePath).toHaveBeenCalledWith('/en/write');
      expect(revalidatePath).toHaveBeenCalledWith('/bn/write');
    });

    it("answers another account's draft as not found and refreshes nothing", async () => {
      scripted['review.discardDraft'] = refusalFor('not_found');

      await expect(discardDraftAction({ draftId: DRAFT_ID })).resolves.toEqual({
        ok: false,
        messageKey: 'errors.common.notFound',
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('previewAction', () => {
    it("previews the draft with the author's own names, whatever names the request carries", async () => {
      const answer = await previewAction({ draftId: DRAFT_ID, names: { named: 'Forged Name' } });

      expect(answer).toEqual({ ok: true, preview: PREVIEW });
      expect(handled['review.preview']).toEqual([
        { draftId: DRAFT_ID, names: { named: 'Abba of Two', pseudonymous: 'abba_of_two' } },
      ]);
    });

    it('refuses a signed-out visitor before the preview runs', async () => {
      signInAs(SIGNED_OUT);

      const answer = await previewAction({ draftId: DRAFT_ID });

      expect(answer).toEqual({ ok: false, messageKey: 'errors.common.forbidden' });
      expect(handled['review.preview']).toBeUndefined();
    });

    it('answers a request that is not an object as a validation refusal', async () => {
      await expect(previewAction('not-an-object')).resolves.toMatchObject({
        ok: false,
        messageKey: 'errors.common.validation',
      });
    });
  });

  describe('duplicateHintAction', () => {
    it("answers whether the author already wrote about the draft's doctor", async () => {
      await expect(duplicateHintAction({ draftId: DRAFT_ID })).resolves.toEqual({
        ok: true,
        duplicate: true,
      });
    });

    it('answers an unconfirmed address with its message key', async () => {
      signInAs(anAccountActor({ emailVerified: false }));

      await expect(duplicateHintAction({ draftId: DRAFT_ID })).resolves.toEqual({
        ok: false,
        messageKey: 'errors.auth.emailUnverified',
      });
    });
  });

  describe('publishDraftAction', () => {
    it('publishes, refreshes every page and opens the new experience', async () => {
      await expect(publishDraftAction(PUBLISH)).rejects.toThrow('NEXT_REDIRECT');

      expect(writes).toEqual([`review.publish by ${ACCOUNT_ID}`]);
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirect).toHaveBeenCalledWith({
        href: `/experiences/${NEW_PUBLIC_ID}?published=1`,
        locale: 'en',
      });
    });

    it('answers the missing minimum fields beside their fields and stays on the page', async () => {
      scripted['review.publish'] = refusalFor('review.min_fields', {
        story: 'errors.review.missingStory',
      });

      await expect(publishDraftAction(PUBLISH)).resolves.toEqual({
        formError: 'errors.review.minFields',
        fieldErrors: { story: 'errors.review.missingStory' },
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('shows the anonymous new-doctor refusal on the identity choice (BR3.12)', async () => {
      scripted['review.publish'] = refusalFor('review.anonymous_new_doctor');

      await expect(publishDraftAction({ ...PUBLISH, identityMode: 'anonymous' })).resolves.toEqual({
        formError: 'errors.review.anonymousNewDoctor',
        fieldErrors: { identity: 'errors.review.anonymousNewDoctor' },
      });
    });

    it('answers the publish limit with the wait', async () => {
      scripted['review.publish'] = err('rate_limited', { correlationId: 'c', retryAfterSec: 600 });

      await expect(publishDraftAction(PUBLISH)).resolves.toEqual({
        formError: 'errors.common.rateLimited',
        fieldErrors: {},
        retryAfterSec: 600,
      });
    });

    it('refuses a signed-out publish and writes nothing', async () => {
      signInAs(SIGNED_OUT);

      await expect(publishDraftAction(PUBLISH)).resolves.toEqual({
        formError: 'errors.common.forbidden',
        fieldErrors: {},
      });
      expect(writes).toEqual([]);
      expect(redirect).not.toHaveBeenCalled();
    });

    it('refuses a restricted account and writes nothing', async () => {
      signInAs(anAccountActor({ status: 'restricted' }));

      await expect(publishDraftAction(PUBLISH)).resolves.toMatchObject({
        formError: 'errors.common.forbidden',
      });
      expect(writes).toEqual([]);
    });

    it('refuses a persona of another account forged into the request and writes nothing', async () => {
      const answer = await publishDraftAction({ ...PUBLISH, personaId: VICTIM_PERSONA_ID });

      expect(answer.formError).toBe('errors.common.validation');
      expect(handled['review.publish']).toBeUndefined();
      expect(writes).toEqual([]);
    });

    it('refuses a publish without the attestation and writes nothing (BR3.1)', async () => {
      const answer = await publishDraftAction({ ...PUBLISH, attestation: false });

      expect(answer.formError).toBe('errors.common.validation');
      expect(writes).toEqual([]);
    });
  });

  describe('publishFacilityVisitAction', () => {
    it("publishes the visit and opens the facility's page", async () => {
      await expect(publishFacilityVisitAction(PUBLISH)).rejects.toThrow('NEXT_REDIRECT');

      expect(writes).toEqual([`facilityReview.publish by ${ACCOUNT_ID}`]);
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirect).toHaveBeenCalledWith({
        href: `/facilities/${BRANCH_PUBLIC_ID}`,
        locale: 'en',
      });
    });

    it('answers facility feedback being off with its message key and no redirect', async () => {
      scripted['facilityReview.publish'] = refusalFor('forbidden');

      await expect(publishFacilityVisitAction(PUBLISH)).resolves.toEqual({
        formError: 'errors.common.forbidden',
        fieldErrors: {},
      });
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
