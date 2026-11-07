import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { getContributionAccess } from '@/server/actions/account';
import { loadThread } from '@/server/actions/comment-thread';
import { logSlotFailure } from '@/server/actions/review-slots';
import {
  renderInLocale,
  testTranslator,
  type TestLocale,
} from '../experience/experience-test-support';
import {
  ANONYMOUS_AUTHOR,
  aCommentItem,
  aCommentVM,
  aPlaceholderItem,
  aThreadVM,
} from './comment-test-support';
import { CommentThread } from './CommentThread';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('../experience/experience-test-support');
  return {
    getTranslations: () => Promise.resolve(support.testTranslator(active.locale)),
    getLocale: () => Promise.resolve(active.locale),
  };
});
vi.mock('@/i18n/routing', async () => {
  const support = await import('../experience/experience-test-support');
  return { Link: support.TestLink };
});
vi.mock('@/server/actions/comments', () => ({
  postComment: vi.fn(() => Promise.resolve({ status: 'idle' })),
  deleteComment: vi.fn(() => Promise.resolve({ status: 'idle' })),
}));
vi.mock('@/server/actions/auth', () => ({ resendOwnLink: vi.fn() }));
vi.mock('@/server/actions/account', () => ({ getContributionAccess: vi.fn() }));
vi.mock('@/server/actions/comment-thread', () => ({ loadThread: vi.fn() }));
vi.mock('@/server/actions/review-slots', () => ({ logSlotFailure: vi.fn() }));

const PUBLIC_ID = 'exp0000001';

async function showSlot(locale: TestLocale) {
  return renderInLocale(locale, await CommentThread({ reviewPublicId: PUBLIC_ID }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(['en', 'bn'] as const)('the comment slot in %s', (locale) => {
  const t = testTranslator(locale);
  beforeEach(() => {
    active.locale = locale;
  });

  it('shows the disclaimer, then comments, replies and a placeholder, then the form', async () => {
    vi.mocked(getContributionAccess).mockResolvedValue('allowed');
    vi.mocked(loadThread).mockResolvedValue(
      aThreadVM([
        aCommentItem({ body: 'First comment' }, [aCommentVM({ body: 'A live reply' })]),
        aPlaceholderItem([aCommentVM({ body: 'Reply under a deleted comment' })]),
        aCommentItem({ body: 'Anonymous words', author: ANONYMOUS_AUTHOR }),
      ]),
    );
    const { container } = await showSlot(locale);

    expect(loadThread).toHaveBeenCalledWith(PUBLIC_ID);
    expect(container.firstElementChild?.firstElementChild).toHaveAttribute(
      'data-testid',
      'comment-disclaimer',
    );
    expect(screen.getByTestId('comment-disclaimer')).toHaveTextContent(t('disclaimer.comments'));
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('A live reply')).toBeInTheDocument();
    expect(container.querySelectorAll('article.comment.tombstone')).toHaveLength(1);
    expect(screen.getByText('Reply under a deleted comment')).toBeInTheDocument();
    expect(screen.getByText('patient-7k2q')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: t('experience.commentBox') })).toBeInTheDocument();
    expect(screen.queryByTestId('contribution-gate')).toBeNull();
  });

  it('says there are no comments yet on an empty open thread', async () => {
    vi.mocked(getContributionAccess).mockResolvedValue('allowed');
    vi.mocked(loadThread).mockResolvedValue(aThreadVM([]));
    await showSlot(locale);
    expect(screen.getByText(t('experience.noComments'))).toBeInTheDocument();
    expect(screen.queryByTestId('thread-truncated')).toBeNull();
  });

  it('notes a truncated thread', async () => {
    vi.mocked(getContributionAccess).mockResolvedValue('allowed');
    vi.mocked(loadThread).mockResolvedValue(aThreadVM([aCommentItem()], { truncated: true }));
    await showSlot(locale);
    expect(screen.getByTestId('thread-truncated')).toHaveTextContent(
      t('experience.threadTruncated'),
    );
  });

  it('shows only the disclaimer and a closed note when the thread is closed', async () => {
    vi.mocked(loadThread).mockResolvedValue({ open: false, items: [], truncated: false });
    await showSlot(locale);
    expect(screen.getByTestId('comment-disclaimer')).toBeInTheDocument();
    expect(screen.getByText(t('experience.discussionClosed'))).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByTestId('contribution-gate')).toBeNull();
    expect(getContributionAccess).not.toHaveBeenCalled();
  });

  it.each(['signed-out', 'unconfirmed', 'unavailable'] as const)(
    'shows the gate and no form for the %s state, keeping the comments readable',
    async (access) => {
      vi.mocked(getContributionAccess).mockResolvedValue(access);
      vi.mocked(loadThread).mockResolvedValue(
        aThreadVM([aCommentItem({ body: 'Readable to everyone' })]),
      );
      await showSlot(locale);

      expect(screen.getByText('Readable to everyone')).toBeInTheDocument();
      expect(screen.getByTestId('contribution-gate')).toHaveAttribute('data-access', access);
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(screen.queryByRole('button', { name: t('experience.reply') })).toBeNull();
    },
  );

  it('sends a signed-out reader back to the experience after sign-in', async () => {
    vi.mocked(getContributionAccess).mockResolvedValue('signed-out');
    vi.mocked(loadThread).mockResolvedValue(aThreadVM([]));
    await showSlot(locale);
    expect(screen.getByTestId('contribution-gate-sign-in')).toHaveAttribute(
      'href',
      `/sign-in?next=%2F${locale}%2Fexperiences%2F${PUBLIC_ID}`,
    );
  });

  it('keeps the disclaimer, logs the failure and shows an error line when the read fails', async () => {
    vi.mocked(loadThread).mockRejectedValue(new Error('boom'));
    await showSlot(locale);

    expect(screen.getByTestId('comment-disclaimer')).toHaveTextContent(t('disclaimer.comments'));
    expect(screen.getByText(t('errors.common.internal'))).toBeInTheDocument();
    expect(logSlotFailure).toHaveBeenCalledWith('comments', expect.any(Error));
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
