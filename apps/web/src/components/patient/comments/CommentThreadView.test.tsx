import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

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
import { CommentThreadView } from './CommentThreadView';

vi.mock('@/i18n/routing', async () => {
  const support = await import('../experience/experience-test-support');
  return { Link: support.TestLink };
});
vi.mock('@/server/actions/comments', () => ({
  postComment: vi.fn(() => Promise.resolve({ status: 'idle' })),
  deleteComment: vi.fn(() => Promise.resolve({ status: 'idle' })),
}));

function renderThread(
  locale: TestLocale,
  thread: Parameters<typeof CommentThreadView>[0]['thread'],
  canContribute = true,
) {
  return renderInLocale(
    locale,
    <CommentThreadView reviewPublicId="exp0000001" thread={thread} canContribute={canContribute} />,
  );
}

describe.each(['en', 'bn'] as const)('the comment thread view in %s', (locale) => {
  const t = testTranslator(locale);

  it('shows comments in the given order with their replies one level below', () => {
    const { container } = renderThread(
      locale,
      aThreadVM([
        aCommentItem({ body: 'Oldest comment' }, [
          aCommentVM({ body: 'First reply' }),
          aCommentVM({ body: 'Second reply' }),
        ]),
        aCommentItem({ body: 'Newer comment' }),
      ]),
    );

    const topLevel = Array.from(container.querySelectorAll(':scope section > div > article'));
    expect(topLevel.map((a) => a.querySelector(':scope > p')?.textContent)).toEqual([
      'Oldest comment',
      'Newer comment',
    ]);
    const replies = topLevel[0]!.querySelectorAll('.comment-replies > article.comment');
    expect(Array.from(replies).map((a) => a.querySelector('p:not(.byline)')?.textContent)).toEqual([
      'First reply',
      'Second reply',
    ]);
  });

  it('shows the commenter and the date with numerals of the active language', () => {
    renderThread(locale, aThreadVM([aCommentItem({ postedAt: '2026-04-03T08:00:00.000Z' })]));
    expect(screen.getByText('Karim Reader')).toBeInTheDocument();
    const date = locale === 'bn' ? '৩ এপ্রিল ২০২৬' : '3 April 2026';
    expect(screen.getByText(date)).toHaveAttribute('dateTime', '2026-04-03');
  });

  it('keeps a deleted comment with replies as a placeholder without author, date or actions', () => {
    const { container } = renderThread(
      locale,
      aThreadVM([aPlaceholderItem([aCommentVM({ body: 'Reply that stays' })])]),
    );
    const placeholder = container.querySelector('article.comment.tombstone') as HTMLElement;
    expect(within(placeholder).getByText(t('experience.commentGone'))).toBeInTheDocument();
    expect(within(placeholder).getByText('Reply that stays')).toBeInTheDocument();
    expect(placeholder.querySelector(':scope > .comment-actions')).toBeNull();
    expect(placeholder.querySelector(':scope > .comment-head')).toBeNull();
    expect(placeholder.querySelector(':scope > .byline')).toBeNull();
  });

  it('offers delete only on the reader’s own comments and reply only on top-level ones', () => {
    renderThread(
      locale,
      aThreadVM([
        aCommentItem({ body: 'Mine', mine: true }, [aCommentVM({ body: 'A reply' })]),
        aCommentItem({ body: 'Someone else’s' }),
      ]),
    );
    expect(screen.getAllByRole('button', { name: t('experience.deleteComment') })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: t('experience.reply') })).toHaveLength(2);
    expect(screen.getByText(t('experience.ownComment'))).toBeInTheDocument();
  });

  it('offers a reply to a reader who may contribute and none to one who may not', () => {
    const thread = aThreadVM([aCommentItem({ body: 'Top level' })]);
    const { unmount } = renderThread(locale, thread, false);
    expect(screen.queryByRole('button', { name: t('experience.reply') })).toBeNull();
    unmount();
    renderThread(locale, thread, true);
    expect(screen.getByRole('button', { name: t('experience.reply') })).toBeInTheDocument();
  });

  it('shows an anonymous commenter by the thread alias, never a name or a link', () => {
    renderThread(
      locale,
      aThreadVM([aCommentItem({ author: ANONYMOUS_AUTHOR, body: 'Said anonymously' })]),
    );
    expect(screen.getByText(t('byline.anonSentence'))).toBeInTheDocument();
    expect(screen.getByTestId('byline-alias')).toHaveTextContent('patient-7k2q');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links a pseudonymous commenter to the author page', () => {
    renderThread(
      locale,
      aThreadVM([
        aCommentItem({
          author: {
            kind: 'pseudonymous',
            displayName: 'quiet_heron',
            username: 'quiet_heron',
            avatarHue: 40,
          },
        }),
      ]),
    );
    expect(screen.getByRole('link', { name: '@quiet_heron' })).toHaveAttribute(
      'href',
      '/authors/quiet_heron',
    );
  });

  it('says there are no comments on an empty thread and notes a truncated one', () => {
    const { unmount } = renderThread(locale, aThreadVM([]));
    expect(screen.getByText(t('experience.noComments'))).toBeInTheDocument();
    unmount();
    renderThread(locale, aThreadVM([aCommentItem()], { truncated: true }));
    expect(screen.getByText(t('experience.threadTruncated'))).toBeInTheDocument();
  });

  it('renders the body as text and carries no account, persona or internal id', () => {
    const { container } = renderThread(
      locale,
      aThreadVM([aCommentItem({ body: '<b>bold</b> <script>alert(1)</script>', mine: true })]),
    );
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<b>bold</b> <script>alert(1)</script>')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/);
    expect(container.innerHTML).not.toMatch(/accountId|personaId|authorId|reviewId/);
  });

  it('shows no like, report, mention or edit control', () => {
    renderThread(locale, aThreadVM([aCommentItem({ mine: true })]));
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual([t('experience.reply'), t('experience.deleteComment')]);
  });
});
