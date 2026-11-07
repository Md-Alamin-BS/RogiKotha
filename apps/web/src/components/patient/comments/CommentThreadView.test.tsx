import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

import {
  buildComment,
  buildThread,
  renderInLocale,
  testTranslator,
  type TestLocale,
} from '../experience/experience-test-support';
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
  threads: Parameters<typeof CommentThreadView>[0]['threads'],
  signedIn = true,
) {
  return renderInLocale(
    locale,
    <CommentThreadView reviewPublicId="exp0000001" threads={threads} signedIn={signedIn} />,
  );
}

describe.each(['en', 'bn'] as const)('the comment thread in %s', (locale) => {
  const t = testTranslator(locale);

  it('shows comments in the given order with their replies one level below', () => {
    const { container } = renderThread(locale, [
      buildThread({ body: 'Oldest comment' }, [
        buildComment({ body: 'First reply' }),
        buildComment({ body: 'Second reply' }),
      ]),
      buildThread({ body: 'Newer comment' }),
    ]);

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
    renderThread(locale, [
      buildThread({
        authorDisplayName: 'Karim Reader',
        createdAt: new Date('2026-04-03T08:00:00Z'),
      }),
    ]);
    expect(screen.getByText('Karim Reader')).toBeInTheDocument();
    const date = locale === 'bn' ? '৩ এপ্রিল ২০২৬' : '3 April 2026';
    expect(screen.getByText(date)).toHaveAttribute('dateTime', '2026-04-03');
  });

  it('keeps a deleted comment with replies as a tombstone without author or text', () => {
    const { container } = renderThread(locale, [
      buildThread({ body: null, authorDisplayName: null, tombstone: true }, [
        buildComment({ body: 'Reply that stays' }),
      ]),
    ]);
    const tombstone = container.querySelector('article.comment.tombstone') as HTMLElement;
    expect(within(tombstone).getByText(t('experience.commentGone'))).toBeInTheDocument();
    expect(within(tombstone).getByText('Reply that stays')).toBeInTheDocument();
    expect(tombstone.querySelector(':scope > .comment-actions')).toBeNull();
    expect(tombstone.querySelector(':scope > .comment-head')).toBeNull();
  });

  it('offers delete only on the reader’s own comments and reply only on top-level ones', () => {
    renderThread(locale, [
      buildThread({ body: 'Mine', canDelete: true }, [buildComment({ body: 'A reply' })]),
      buildThread({ body: 'Someone else’s' }),
    ]);
    expect(screen.getAllByRole('button', { name: t('experience.deleteComment') })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: t('experience.reply') })).toHaveLength(2);
    expect(screen.getByText(t('experience.ownComment'))).toBeInTheDocument();
  });

  it('shows an anonymous commenter without a name', () => {
    renderThread(locale, [buildThread({ authorDisplayName: null, body: 'Said anonymously' })]);
    expect(screen.getByText(t('byline.anonSentence'))).toBeInTheDocument();
  });

  it('gives a signed-in reader the comment form', () => {
    renderThread(locale, []);
    expect(screen.getByRole('textbox', { name: t('experience.commentBox') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('experience.commentPost') })).toBeInTheDocument();
    expect(screen.getByText(t('mine.empty'))).toBeInTheDocument();
  });

  it('sends a signed-out reader to sign in and back, with no form and no reply button', () => {
    renderThread(locale, [buildThread({ body: 'Visible to everyone' })], false);
    expect(screen.getByRole('link', { name: t('experience.signInToComment') })).toHaveAttribute(
      'href',
      '/sign-in?next=%2Fexperiences%2Fexp0000001',
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: t('experience.reply') })).toBeNull();
    expect(screen.getByText('Visible to everyone')).toBeInTheDocument();
  });
});
