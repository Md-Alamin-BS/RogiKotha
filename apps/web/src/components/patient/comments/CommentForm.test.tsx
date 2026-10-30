import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { deleteComment, postComment } from '@/server/actions/comments';
import {
  renderInLocale,
  testTranslator,
  type TestLocale,
} from '../experience/experience-test-support';
import { CommentActions } from './CommentActions';
import { COMMENT_BODY_MAX, CommentForm } from './CommentForm';

vi.mock('@/server/actions/comments', () => ({
  postComment: vi.fn(),
  deleteComment: vi.fn(),
}));

function lastFormData(mock: typeof postComment | typeof deleteComment): FormData {
  const call = vi.mocked(mock).mock.calls.at(-1);
  if (!call) throw new Error('the action was not called');
  return call[1];
}

function liveRegion(): HTMLElement {
  const region = document.createElement('div');
  region.id = 'sr-live';
  document.body.append(region);
  return region;
}

beforeEach(() => {
  vi.mocked(postComment).mockReset();
  vi.mocked(deleteComment).mockReset();
  document.getElementById('sr-live')?.remove();
});

describe.each(['en', 'bn'] as const)('the comment form in %s', (locale: TestLocale) => {
  const t = testTranslator(locale);

  it('posts the text for the experience and announces the posted comment', async () => {
    const region = liveRegion();
    vi.mocked(postComment).mockResolvedValue({
      status: 'done',
      messageKey: 'experience.commentPosted',
      at: 1,
    });
    renderInLocale(locale, <CommentForm reviewPublicId="exp0000001" />);

    const box = screen.getByRole('textbox', { name: t('experience.commentBox') });
    expect(box).toHaveAttribute('maxLength', String(COMMENT_BODY_MAX));
    await userEvent.type(box, 'Thank you for writing this');
    await userEvent.click(screen.getByRole('button', { name: t('experience.commentPost') }));

    await waitFor(() => expect(region).toHaveTextContent(t('experience.commentPosted')));
    const sent = lastFormData(postComment);
    expect(sent.get('reviewPublicId')).toBe('exp0000001');
    expect(sent.get('body')).toBe('Thank you for writing this');
    expect(sent.get('parentPublicId')).toBeNull();
  });

  it('shows a refusal in the active language and keeps the text', async () => {
    vi.mocked(postComment).mockResolvedValue({
      status: 'error',
      messageKey: 'experience.commentLength',
      values: { min: 1, max: 2000 },
      body: 'kept text',
    });
    renderInLocale(locale, <CommentForm reviewPublicId="exp0000001" />);

    await userEvent.type(screen.getByRole('textbox'), 'kept text');
    await userEvent.click(screen.getByRole('button', { name: t('experience.commentPost') }));

    const max = locale === 'bn' ? '২,০০০' : '2,000';
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(max);
    expect(alert).toHaveTextContent(
      t('experience.commentLength', { min: locale === 'bn' ? '১' : '1', max }),
    );
    expect(screen.getByRole('textbox')).toHaveValue('kept text');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe.each(['en', 'bn'] as const)('the comment actions in %s', (locale: TestLocale) => {
  const t = testTranslator(locale);

  function renderActions(canDelete = true) {
    return renderInLocale(
      locale,
      <CommentActions
        reviewPublicId="exp0000001"
        commentPublicId="cmt0000001"
        authorName="Karim Reader"
        canReply
        canDelete={canDelete}
      />,
    );
  }

  it('opens a reply box under the comment and posts the reply to it', async () => {
    vi.mocked(postComment).mockResolvedValue({
      status: 'done',
      messageKey: 'experience.commentPosted',
      at: 2,
    });
    renderActions(false);

    const reply = screen.getByRole('button', { name: t('experience.reply') });
    expect(reply).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(reply);
    expect(reply).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Karim Reader')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox'), 'A reply');
    await userEvent.click(screen.getByRole('button', { name: t('experience.replyPost') }));

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    const sent = lastFormData(postComment);
    expect(sent.get('parentPublicId')).toBe('cmt0000001');
    expect(sent.get('body')).toBe('A reply');
  });

  it('closes the reply box on cancel without posting', async () => {
    renderActions(false);
    await userEvent.click(screen.getByRole('button', { name: t('experience.reply') }));
    await userEvent.click(screen.getByRole('button', { name: t('experience.replyCancel') }));

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(postComment).not.toHaveBeenCalled();
  });

  it('asks the server to delete the comment and shows its refusal', async () => {
    vi.mocked(deleteComment).mockResolvedValue({
      status: 'error',
      messageKey: 'errors.common.notFound',
    });
    renderActions(true);

    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.common.notFound'));
    const sent = lastFormData(deleteComment);
    expect(sent.get('commentPublicId')).toBe('cmt0000001');
    expect(sent.get('reviewPublicId')).toBe('exp0000001');
  });

  it('renders nothing when the reader can neither reply nor delete', () => {
    const { container } = renderInLocale(
      locale,
      <CommentActions
        reviewPublicId="exp0000001"
        commentPublicId="cmt0000001"
        authorName={null}
        canReply={false}
        canDelete={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
