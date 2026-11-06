// @vitest-environment node
import type { DemoCurrentAccount, DemoReviewDetail } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAccount, requireContributor } from '@/server/auth/session';
import { comments, reviews } from '@/server/data';
import { deleteComment, postComment, type CommentActionState } from './comments';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn(), requireContributor: vi.fn() }));
vi.mock('@/server/data', () => ({
  comments: { addComment: vi.fn(), deleteOwnComment: vi.fn() },
  reviews: { getReviewByPublicId: vi.fn() },
}));

const REVIEW_PUBLIC_ID = 'exp0000001';
const COMMENT_PUBLIC_ID = 'cmt0000001';
const IDLE: CommentActionState = { status: 'idle' };

function buildAccount(overrides: Partial<DemoCurrentAccount> = {}): DemoCurrentAccount {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'karim_reader',
    displayName: 'Karim Reader',
    locale: 'en',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

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

const review = { id: '0190f5a2-0000-7000-8000-0000000000r1' } as DemoReviewDetail;

describe('posting a comment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireContributor).mockResolvedValue(buildAccount());
    vi.mocked(reviews.getReviewByPublicId).mockResolvedValue(review);
    vi.mocked(comments.addComment).mockResolvedValue({
      ok: true,
      data: { id: 'c1', publicId: COMMENT_PUBLIC_ID },
    });
  });

  it('posts the trimmed text as the signed-in account’s named persona and refreshes the page', async () => {
    const state = await postComment(IDLE, commentForm({ body: '  Thank you  ' }));

    expect(state).toMatchObject({ status: 'done', messageKey: 'experience.commentPosted' });
    expect(comments.addComment).toHaveBeenCalledWith({
      reviewId: review.id,
      parentPublicId: null,
      authorPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
      body: 'Thank you',
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/en/experiences/${REVIEW_PUBLIC_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/bn/experiences/${REVIEW_PUBLIC_ID}`);
  });

  it('posts a reply to the given parent comment', async () => {
    await postComment(IDLE, commentForm({ parentPublicId: COMMENT_PUBLIC_ID }));
    expect(vi.mocked(comments.addComment).mock.calls[0]![0].parentPublicId).toBe(COMMENT_PUBLIC_ID);
  });

  it('asks a signed-out visitor to sign in and come back, and posts nothing', async () => {
    vi.mocked(requireContributor).mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(postComment(IDLE, commentForm())).rejects.toThrow('NEXT_REDIRECT');
    expect(requireContributor).toHaveBeenCalledWith({
      returnTo: `/experiences/${REVIEW_PUBLIC_ID}`,
    });
    expect(comments.addComment).not.toHaveBeenCalled();
  });

  it('never passes a malformed experience id on as the sign-in return path', async () => {
    vi.mocked(requireContributor).mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(
      postComment(IDLE, commentForm({ reviewPublicId: '//evil.example' })),
    ).rejects.toThrow();
    expect(requireContributor).toHaveBeenCalledWith({});
  });

  it.each([
    ['empty', '   '],
    ['too long', 'x'.repeat(2001)],
  ])('refuses an %s comment with the length message and keeps the text', async (_case, body) => {
    const state = await postComment(IDLE, commentForm({ body }));

    expect(state).toEqual({
      status: 'error',
      messageKey: 'experience.commentLength',
      values: { min: 1, max: 2000 },
      body: body.trim(),
    });
    expect(comments.addComment).not.toHaveBeenCalled();
  });

  it('accepts a comment of exactly 2000 characters', async () => {
    const state = await postComment(IDLE, commentForm({ body: 'x'.repeat(2000) }));
    expect(state.status).toBe('done');
  });

  it('refuses a malformed experience or parent id before touching the data', async () => {
    const badReview = await postComment(IDLE, commentForm({ reviewPublicId: 'not-an-id' }));
    const badParent = await postComment(IDLE, commentForm({ parentPublicId: "x' or 1=1" }));

    expect(badReview).toMatchObject({ status: 'error', messageKey: 'errors.common.validation' });
    expect(badParent).toMatchObject({ status: 'error', messageKey: 'errors.common.validation' });
    expect(reviews.getReviewByPublicId).not.toHaveBeenCalled();
  });

  it('reports an experience that is not published as not found', async () => {
    vi.mocked(reviews.getReviewByPublicId).mockResolvedValue(null);
    const state = await postComment(IDLE, commentForm());
    expect(state).toMatchObject({ status: 'error', messageKey: 'errors.common.notFound' });
    expect(comments.addComment).not.toHaveBeenCalled();
  });

  it.each([
    ['reply_depth', 'errors.community.replyDepth'],
    ['parent_not_found', 'errors.common.notFound'],
  ] as const)('maps the %s refusal to its message', async (reason, messageKey) => {
    vi.mocked(comments.addComment).mockResolvedValue({ ok: false, reason });
    const state = await postComment(IDLE, commentForm({ parentPublicId: COMMENT_PUBLIC_ID }));
    expect(state).toMatchObject({ status: 'error', messageKey });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleting a comment', () => {
  const deleteForm = (overrides: Record<string, string> = {}) =>
    form({ reviewPublicId: REVIEW_PUBLIC_ID, commentPublicId: COMMENT_PUBLIC_ID, ...overrides });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAccount).mockResolvedValue(buildAccount());
    vi.mocked(comments.deleteOwnComment).mockResolvedValue({
      ok: true,
      data: { tombstone: false },
    });
  });

  it('deletes only as the signed-in account and refreshes the page', async () => {
    const state = await deleteComment(IDLE, deleteForm());

    expect(state).toMatchObject({ status: 'done', messageKey: 'experience.commentDeleted' });
    expect(comments.deleteOwnComment).toHaveBeenCalledWith(
      COMMENT_PUBLIC_ID,
      '0190f5a2-0000-7000-8000-000000000001',
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/bn/experiences/${REVIEW_PUBLIC_ID}`);
  });

  it('reports someone else’s comment as not found', async () => {
    vi.mocked(comments.deleteOwnComment).mockResolvedValue({ ok: false, reason: 'not_found' });
    const state = await deleteComment(IDLE, deleteForm());
    expect(state).toEqual({ status: 'error', messageKey: 'errors.common.notFound' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('refuses a malformed comment id', async () => {
    const state = await deleteComment(IDLE, deleteForm({ commentPublicId: '../../etc' }));
    expect(state).toEqual({ status: 'error', messageKey: 'errors.common.validation' });
    expect(comments.deleteOwnComment).not.toHaveBeenCalled();
  });

  it('deletes nothing for a signed-out visitor', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(deleteComment(IDLE, deleteForm())).rejects.toThrow('NEXT_REDIRECT');
    expect(comments.deleteOwnComment).not.toHaveBeenCalled();
  });
});
