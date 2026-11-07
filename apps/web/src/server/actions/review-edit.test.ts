// @vitest-environment node
// `correctReviewAction` runs the real `runCommand` against a stand-in `review.correct` built with
// `defineCommand` on the module's own input schema and gate, so parsing and authorization are real
// and a scripted answer stands in for the module's decision. Ownership itself is decided (and
// tested) in the command; here only the form mapping, the result keys and the redirect are tested.
import { defineCommand, type Command } from '@rogikotha/application';
import {
  CorrectReviewInput,
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
import { requireContributor } from '@/server/auth/session';
import { getContainer } from '@/server/container';
import { correctReviewAction, type CorrectFormState } from './review-edit';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireContributor: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const PUBLIC_ID = 'a1b2c3d4e5';
const ACCOUNT_ID = '0190f5a2-0000-7000-8000-000000000001';
const CORRELATION_ID = '0190f5a2-0000-7000-8000-0000000000c1';

const START: CorrectFormState = { attempt: 0, values: null, fieldErrors: {}, formError: null };

const ACTOR: Actor = {
  kind: 'account',
  accountId: ACCOUNT_ID,
  personaId: '0190f5a2-0000-7000-8000-0000000000aa',
  emailVerified: true,
  status: 'active',
  capabilities: [],
  locale: 'en',
  correlationId: CORRELATION_ID,
};

/** The parsed inputs the stand-in command handled. */
let handled: unknown[];
/** What the stand-in answers next; `ok` when unset. */
let scripted: Result<{ publicId: string; version: number; changed: boolean }> | null;
let logger: {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function aCorrectCommand(): Command<
  CorrectReviewInput,
  { publicId: string; version: number; changed: boolean }
> {
  return defineCommand({
    name: 'review.correct',
    input: CorrectReviewInput,
    requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
    handle: ({ input }) => {
      handled.push(input);
      return Promise.resolve(
        scripted ?? ok({ publicId: input.publicId, version: 2, changed: true }),
      );
    },
  });
}

function refusal(
  code: ErrorCode,
  extra: { fieldErrors?: Record<string, string>; retryAfterSec?: number } = {},
) {
  return err(code, { correlationId: CORRELATION_ID, ...extra });
}

function aQuickForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const fields = {
    publicId: PUBLIC_ID,
    expectedVersion: '1',
    kind: 'quick',
    title: 'Calm, but the follow-up was slow',
    story: 'The follow-up appointment took three weeks to arrange this time.',
    sentiment: 'mixed',
    outcome: 'helped',
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  handled = [];
  scripted = null;
  logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  vi.mocked(getLocale).mockResolvedValue('en');
  vi.mocked(requireContributor).mockResolvedValue({} as never);
  vi.mocked(getRequestContext).mockResolvedValue({
    actor: ACTOR,
    session: null,
    request: { headers: new Headers(), clientAddress: null, sessionId: null },
  });
  vi.mocked(getContainer).mockReturnValue({
    ports: {
      unitOfWork: {
        run: (work: (tx: unknown) => unknown) => work({}),
        read: (work: (tx: unknown) => unknown) => work({}),
      },
      logger,
    },
    review: { correct: aCorrectCommand() },
  } as unknown as ReturnType<typeof getContainer>);
});

describe('correctReviewAction', () => {
  describe('an accepted save', () => {
    it.each([
      ['en', `/experiences/${PUBLIC_ID}`],
      ['bn', `/experiences/${PUBLIC_ID}`],
    ] as const)('opens the experience page again in %s', async (locale, href) => {
      vi.mocked(getLocale).mockResolvedValue(locale);

      await expect(correctReviewAction(START, aQuickForm())).rejects.toThrow('NEXT_REDIRECT');

      expect(redirect).toHaveBeenCalledWith({ href, locale });
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('opens the experience page again for a save that changed nothing', async () => {
      scripted = ok({ publicId: PUBLIC_ID, version: 1, changed: false });

      await expect(correctReviewAction(START, aQuickForm())).rejects.toThrow('NEXT_REDIRECT');

      expect(redirect).toHaveBeenCalledWith({ href: `/experiences/${PUBLIC_ID}`, locale: 'en' });
    });

    it('hands a quick review to the command as a story, with the clearable fields omitted when empty', async () => {
      const form = aQuickForm({ sentiment: '', outcome: '' });
      form.append('claims', 'wrongDx');
      form.append('claims', 'A label exactly as stored');

      await expect(correctReviewAction(START, form)).rejects.toThrow('NEXT_REDIRECT');

      expect(handled).toEqual([
        {
          publicId: PUBLIC_ID,
          expectedVersion: 1,
          title: 'Calm, but the follow-up was slow',
          content: {
            kind: 'quick',
            story: 'The follow-up appointment took three weeks to arrange this time.',
          },
          claims: ['wrongDx', 'A label exactly as stored'],
        },
      ]);
    });

    it('hands a detailed review to the command as its non-empty sections only', async () => {
      const form = aQuickForm({
        kind: 'detailed',
        story: 'ignored for a detailed review',
        symptoms: 'A slow cough for three weeks.',
        diagnosis: '',
        treatment: 'A short course of rest.',
        after: '',
      });

      await expect(correctReviewAction(START, form)).rejects.toThrow('NEXT_REDIRECT');

      expect(handled).toEqual([
        expect.objectContaining({
          content: {
            kind: 'detailed',
            sections: {
              symptoms: 'A slow cough for three weeks.',
              treatment: 'A short course of rest.',
            },
          },
          sentiment: 'mixed',
          outcome: 'helped',
          claims: [],
        }),
      ]);
    });
  });

  describe('a refused save', () => {
    it('maps validation to its field errors and keeps the typed values', async () => {
      scripted = refusal('validation', { fieldErrors: { story: 'errors.review.missingStory' } });
      const form = aQuickForm({ story: 'short' });
      form.append('claims', 'wrongRx');

      const state = await correctReviewAction({ ...START, attempt: 2 }, form);

      expect(state).toEqual({
        attempt: 3,
        values: {
          title: 'Calm, but the follow-up was slow',
          story: 'short',
          symptoms: '',
          diagnosis: '',
          treatment: '',
          after: '',
          sentiment: 'mixed',
          outcome: 'helped',
          claims: ['wrongRx'],
        },
        fieldErrors: { story: 'errors.review.missingStory' },
        formError: 'errors.common.validation',
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('maps a version conflict to its key and asks for the reload link', async () => {
      scripted = refusal('conflict');

      const state = await correctReviewAction(START, aQuickForm());

      expect(state).toMatchObject({
        attempt: 1,
        formError: 'errors.review.editConflict',
        conflict: true,
        fieldErrors: {},
      });
    });

    it('maps the daily limit to its key and passes the wait on', async () => {
      scripted = refusal('rate_limited', { retryAfterSec: 3600 });

      const state = await correctReviewAction(START, aQuickForm());

      expect(state).toMatchObject({
        formError: 'errors.review.correctionsLimit',
        retryAfterSec: 3600,
      });
      expect(state.conflict).toBeUndefined();
    });

    it('maps the publish gate to the forbidden key', async () => {
      scripted = refusal('forbidden');

      await expect(correctReviewAction(START, aQuickForm())).resolves.toMatchObject({
        formError: 'errors.common.forbidden',
      });
    });

    it('maps not found, which also means "not yours", to the not-found key', async () => {
      scripted = refusal('not_found');

      await expect(correctReviewAction(START, aQuickForm())).resolves.toMatchObject({
        formError: 'errors.common.notFound',
      });
      expect(redirect).not.toHaveBeenCalled();
    });

    it('answers an unexpected error with the internal key and logs the code and correlation id only', async () => {
      scripted = refusal('internal');

      const state = await correctReviewAction(START, aQuickForm());

      expect(state.formError).toBe('errors.common.internal');
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('review.correct_failed', {
        errorCode: 'internal',
        correlationId: CORRELATION_ID,
      });
    });

    it('answers a thrown error with the internal key and logs no submitted text', async () => {
      vi.mocked(getContainer).mockReturnValue({
        ports: { logger },
        review: {
          correct: {
            execute: () => Promise.reject(new Error('the story text leaked into this message')),
          },
        },
      } as unknown as ReturnType<typeof getContainer>);

      const state = await correctReviewAction(START, aQuickForm());

      expect(state.formError).toBe('errors.common.internal');
      expect(logger.error).toHaveBeenCalledWith('review.correct_failed', { errorCode: 'internal' });
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain('leaked');
    });

    it('lets the command refuse a version that is not a number', async () => {
      const state = await correctReviewAction(START, aQuickForm({ expectedVersion: 'abc' }));

      expect(state.formError).toBe('errors.common.validation');
      expect(handled).toEqual([]);
    });

    it('keeps no ids in the state it hands back', async () => {
      scripted = refusal('conflict');

      const state = await correctReviewAction(START, aQuickForm());

      expect(Object.keys(state.values ?? {})).not.toContain('publicId');
      expect(Object.keys(state.values ?? {})).not.toContain('expectedVersion');
      expect(JSON.stringify(state)).not.toContain(PUBLIC_ID);
      expect(JSON.stringify(state)).not.toContain(ACCOUNT_ID);
    });
  });

  describe('before the command', () => {
    it('never reaches the command for a malformed public id', async () => {
      const state = await correctReviewAction(START, aQuickForm({ publicId: "x' or 1=1" }));

      expect(state.formError).toBe('errors.common.notFound');
      expect(handled).toEqual([]);
      expect(requireContributor).toHaveBeenCalledWith({ returnTo: '/me' });
    });

    it('sends a signed-out visitor to sign in, back to the edit page, and writes nothing', async () => {
      vi.mocked(requireContributor).mockRejectedValue(new Error('NEXT_REDIRECT'));

      await expect(correctReviewAction(START, aQuickForm())).rejects.toThrow('NEXT_REDIRECT');

      expect(requireContributor).toHaveBeenCalledWith({
        returnTo: `/experiences/${PUBLIC_ID}/edit`,
      });
      expect(handled).toEqual([]);
    });

    it('refuses an actor who is not signed in at the command, whatever the form says', async () => {
      vi.mocked(getRequestContext).mockResolvedValue({
        actor: { kind: 'anonymous', capabilities: [], locale: 'en', correlationId: CORRELATION_ID },
        session: null,
        request: { headers: new Headers(), clientAddress: null, sessionId: null },
      });

      const state = await correctReviewAction(START, aQuickForm());

      expect(state.formError).toBe('errors.common.forbidden');
      expect(handled).toEqual([]);
    });
  });
});
