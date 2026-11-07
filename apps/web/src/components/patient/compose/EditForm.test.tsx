import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveReviewEdit, type EditFormState } from '@/server/actions/review';
import { EditForm, type EditFormProps } from './EditForm';
import { renderInLocale, translatorFor, type TestLocale } from './compose-test-support';

vi.mock('@/server/actions/review', () => ({ saveReviewEdit: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function someProps(overrides: Partial<EditFormProps> = {}): EditFormProps {
  return {
    publicId: 'a1b2c3d4e5',
    doctorName: 'Dr. Synthetic Rahman',
    defaults: {
      title: 'Calm and careful with my son',
      body: 'She listened to every question and explained the doses slowly.',
      sentiment: 'positive',
      outcome: '',
    },
    ...overrides,
  };
}

describe.each(['en', 'bn'] as const)('the edit form in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('opens with the current title, story and answers', () => {
    renderInLocale(<EditForm {...someProps()} />, locale);

    expect(screen.getByTestId('compose-title')).toHaveValue('Calm and careful with my son');
    expect(screen.getByTestId('compose-body')).toHaveValue(
      'She listened to every question and explained the doses slowly.',
    );
    expect(screen.getByRole('button', { name: t('sentiment.positive') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: t('compose.edit.save') })).toBeEnabled();
    expect(screen.getByTestId('edit-cancel')).toHaveAttribute('href', '/experiences/a1b2c3d4e5');
  });

  it('reads "Not provided" when the doctor cannot be shown', () => {
    renderInLocale(<EditForm {...someProps({ doctorName: null })} />, locale);
    expect(screen.getByTestId('edit-doctor')).toHaveTextContent(t('label.notProvided'));
  });
});

describe('saving an edit', () => {
  beforeEach(() => vi.mocked(saveReviewEdit).mockReset());

  it('sends the public id with the fields and shows a refusal from the server', async () => {
    const refused: EditFormState = {
      attempt: 1,
      values: null,
      fieldErrors: {},
      formError: 'errors.common.notFound',
    };
    vi.mocked(saveReviewEdit).mockResolvedValue(refused);
    const user = userEvent.setup();
    renderInLocale(<EditForm {...someProps()} />, 'en');

    await user.click(screen.getByRole('button', { name: 'Mixed' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByTestId('compose-error')).toHaveTextContent(/find that/));
    const submitted = vi.mocked(saveReviewEdit).mock.calls[0]?.[1];
    expect(submitted?.get('publicId')).toBe('a1b2c3d4e5');
    expect(submitted?.get('sentiment')).toBe('mixed');
    expect(submitted?.get('title')).toBe('Calm and careful with my son');
  });
});
