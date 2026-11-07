import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { deleteComment } from '@/server/actions/comments';
import {
  renderInLocale,
  testTranslator,
  type TestLocale,
} from '../experience/experience-test-support';
import { DeleteCommentButton } from './DeleteCommentButton';

vi.mock('@/server/actions/comments', () => ({ postComment: vi.fn(), deleteComment: vi.fn() }));

function liveRegion(): HTMLElement {
  const region = document.createElement('div');
  region.id = 'sr-live';
  document.body.append(region);
  return region;
}

beforeEach(() => {
  vi.mocked(deleteComment).mockReset();
  document.getElementById('sr-live')?.remove();
});

describe.each(['en', 'bn'] as const)('the delete control in %s', (locale: TestLocale) => {
  const t = testTranslator(locale);

  function renderButton() {
    return renderInLocale(
      locale,
      <DeleteCommentButton reviewPublicId="exp0000001" commentPublicId="cmt0000001" />,
    );
  }

  it('asks to confirm first and deletes nothing until confirmed', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));

    expect(screen.getByText(t('experience.deleteConfirm'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('experience.deleteCancel') })).toHaveFocus();
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it('cancels back to the control, with focus on it, without calling the server', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteCancel') }));

    const open = screen.getByRole('button', { name: t('experience.deleteComment') });
    expect(open).toHaveFocus();
    expect(screen.queryByText(t('experience.deleteConfirm'))).toBeNull();
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it('sends the public ids on confirm and announces the result', async () => {
    const region = liveRegion();
    vi.mocked(deleteComment).mockResolvedValue({
      status: 'done',
      messageKey: 'experience.commentDeleted',
      at: 1,
    });
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));

    await waitFor(() => expect(region).toHaveTextContent(t('experience.commentDeleted')));
    const sent = vi.mocked(deleteComment).mock.calls.at(-1)![1];
    expect(sent.get('commentPublicId')).toBe('cmt0000001');
    expect(sent.get('reviewPublicId')).toBe('exp0000001');
  });

  it('disables the controls while the request is pending', async () => {
    let finish: (value: { status: 'idle' }) => void = () => undefined;
    vi.mocked(deleteComment).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('experience.deleteComment') })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: t('experience.deleteCancel') })).toBeDisabled();
    finish({ status: 'idle' });
  });

  it('shows a refusal in the active language', async () => {
    vi.mocked(deleteComment).mockResolvedValue({
      status: 'error',
      messageKey: 'errors.common.notFound',
    });
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));
    await userEvent.click(screen.getByRole('button', { name: t('experience.deleteComment') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.common.notFound'));
  });
});
