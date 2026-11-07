// @vitest-environment node
import {
  err,
  ok,
  parseInput,
  PostCommentInput,
  type ErrorCode,
  type Result,
} from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '@/server/command-call';
import { deleteComment, postComment, type CommentActionState } from './comments';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({
  getContainer: () => ({
    community: { postComment: 'post-command', deleteComment: 'delete-command' },
  }),
}));

const REVIEW_PUBLIC_ID = 'exp0000001';
const COMMENT_PUBLIC_ID = 'cmt0000001';
const IDLE: CommentActionState = { status: 'idle' };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function commentForm(overrides: Record<string, string> = {}): FormData {
  return form({
    reviewPublicId: REVIEW_PUBLIC_ID,
    body: 'Thank you for writing this',
    ...overrides,
  });
}

function answer(result: Result<unknown>): void {
  vi.mocked(runCommand).mockResolvedValue(result);
}

describe('posting a comment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answer(ok({ publicId: COMMENT_PUBLIC_ID }));
  });

  it('hands the trimmed text to the module and refreshes both language pages', async () => {
    const state = await postComment(IDLE, commentForm({ body: '  Thank you  ' }));

    expect(state).toMatchObject({ status: 'done', messageKey: 'experience.commentPosted' });
    expect(runCommand).toHaveBeenCalledWith('post-command', {
      reviewPublicId: REVIEW_PUBLIC_ID,
      body: 'Thank you',
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/en/experiences/${REVIEW_PUBLIC_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/bn/experiences/${REVIEW_PUBLIC_ID}`);
  });

  it('sends the parent public id for a reply and nothing else the form carries', async () => {
    await postComment(
      IDLE,
      commentForm({ parentPublicId: COMMENT_PUBLIC_ID, authorPersonaId: 'forged-persona' }),
    );

    expect(runCommand).toHaveBeenCalledWith('post-command', {
      reviewPublicId: REVIEW_PUBLIC_ID,
      parentPublicId: COMMENT_PUBLIC_ID,
      body: 'Thank you for writing this',
    });
  });

  it('keeps the text and gives the length message with its limits when the body is refused', async () => {
    answer(err('validation', { fieldErrors: { body: 'errors.community.commentLength' } }));

    const state = await postComment(IDLE, commentForm({ body: '   ' }));

    expect(state).toEqual({
      status: 'error',
      messageKey: 'errors.community.commentLength',
      values: { min: 1, max: 2000 },
      body: '',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  describe('with the real input schema (FD-115)', () => {
    const ch = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

    beforeEach(() => {
      vi.mocked(runCommand).mockImplementation((_command, raw) =>
        Promise.resolve(parseInput(PostCommentInput, raw)),
      );
    });

    it.each([
      ['zero-width space only', ch(0x200b)],
      ['zero-width characters and spaces', ` ${ch(0x200b, 0x2060, 0xfeff)} `],
    ])('refuses a body of %s with the length message', async (_name, body) => {
      const state = await postComment(IDLE, commentForm({ body }));

      expect(state).toMatchObject({
        status: 'error',
        messageKey: 'errors.community.commentLength',
        values: { min: 1, max: 2000 },
      });
    });

    it.each([
      ['NUL', 0x0000],
      ['a right-to-left override', 0x202e],
      ['a left-to-right isolate', 0x2066],
      ['a zero-width space in text', 0x200b],
    ])('refuses %s with the hidden-character message and keeps the text', async (_name, cp) => {
      const body = `My own${ch(cp)} words`;

      const state = await postComment(IDLE, commentForm({ body }));

      expect(state).toEqual({
        status: 'error',
        messageKey: 'errors.community.commentHidden',
        body,
      });
    });

    it('accepts a multi-line Bengali body with ZWJ and ZWNJ', async () => {
      const body = `প্রথম লাইন: র${ch(0x200d)}্যাব।\nদ্বিতীয় লাইন: উদ্${ch(0x200c)}যাপন।`;

      const state = await postComment(IDLE, commentForm({ body }));

      expect(state).toMatchObject({ status: 'done', messageKey: 'experience.commentPosted' });
    });
  });

  it.each([
    ['validation', 'errors.common.validation'],
    ['community.reply_depth', 'errors.community.replyDepth'],
    ['not_found', 'errors.common.notFound'],
    ['forbidden', 'errors.common.forbidden'],
    ['auth.email_unverified', 'errors.auth.emailUnverified'],
    ['conflict', 'errors.common.internal'],
  ] as [ErrorCode, string][])(
    'maps a %s refusal to %s and keeps the text',
    async (code, messageKey) => {
      answer(err(code));

      const state = await postComment(IDLE, commentForm({ body: 'My own words' }));

      expect(state).toEqual({ status: 'error', messageKey, body: 'My own words' });
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([
    [1, 1],
    [59, 1],
    [60, 1],
    [61, 2],
    [3600, 60],
  ])('turns a rate limit of %s seconds into %s minutes', async (retryAfterSec, minutes) => {
    answer(err('rate_limited', { retryAfterSec }));

    const state = await postComment(IDLE, commentForm());

    expect(state).toEqual({
      status: 'error',
      messageKey: 'errors.common.rateLimited',
      values: { minutes },
      body: 'Thank you for writing this',
    });
  });

  it('does not refresh a page named by a malformed public id', async () => {
    await postComment(IDLE, commentForm({ reviewPublicId: '//evil.example' }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('puts no internal id in a done result', async () => {
    const state = await postComment(IDLE, commentForm());
    expect(JSON.stringify(state)).not.toContain(COMMENT_PUBLIC_ID);
  });
});

describe('deleting a comment', () => {
  const deleteForm = (overrides: Record<string, string> = {}) =>
    form({ reviewPublicId: REVIEW_PUBLIC_ID, commentPublicId: COMMENT_PUBLIC_ID, ...overrides });

  beforeEach(() => {
    vi.clearAllMocks();
    answer(ok({ placeholder: false }));
  });

  it('asks the module for the one comment and refreshes both language pages', async () => {
    const state = await deleteComment(IDLE, deleteForm({ accountId: 'forged-account' }));

    expect(state).toMatchObject({ status: 'done', messageKey: 'experience.commentDeleted' });
    expect(runCommand).toHaveBeenCalledWith('delete-command', {
      commentPublicId: COMMENT_PUBLIC_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/en/experiences/${REVIEW_PUBLIC_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/bn/experiences/${REVIEW_PUBLIC_ID}`);
  });

  it.each([
    ['not_found', 'errors.common.notFound'],
    ['validation', 'errors.common.validation'],
    ['forbidden', 'errors.common.forbidden'],
  ] as [ErrorCode, string][])('maps a %s refusal to %s', async (code, messageKey) => {
    answer(err(code));

    const state = await deleteComment(IDLE, deleteForm());

    expect(state).toEqual({ status: 'error', messageKey });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
