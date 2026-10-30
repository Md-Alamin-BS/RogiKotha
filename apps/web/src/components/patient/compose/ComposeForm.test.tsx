import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComposeFormState, ComposeValues } from '@/server/actions/review';
import { publishReview } from '@/server/actions/review';
import { ComposeForm, type ComposeFormProps } from './ComposeForm';
import { renderInLocale, translatorFor, type TestLocale } from './compose-test-support';

vi.mock('@/server/actions/review', () => ({ publishReview: vi.fn(), saveReviewEdit: vi.fn() }));

function someDefaults(overrides: Partial<ComposeValues> = {}): ComposeValues {
  return {
    doctorId: '',
    relationship: 'self',
    period: '2026-03',
    title: '',
    body: '',
    sentiment: '',
    outcome: '',
    identity: 'pseudonymous',
    ...overrides,
  };
}

function someProps(overrides: Partial<ComposeFormProps> = {}): ComposeFormProps {
  return {
    doctors: [
      { id: 'doc-1', label: 'Dr. Synthetic Rahman — Paediatrics' },
      { id: 'doc-2', label: 'Dr. Example Sultana' },
    ],
    periods: [
      { value: '2026-03', label: 'March 2026' },
      { value: '2026-02', label: 'February 2026' },
    ],
    names: { named: 'Abba of Two', pseudonymous: 'abba_of_two' },
    defaults: someDefaults(),
    ...overrides,
  };
}

function hiddenValue(name: string): string | undefined {
  return document.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;
}

describe.each(['en', 'bn'] as const)('the composer in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('renders every quick-review field with the active language labels', () => {
    renderInLocale(<ComposeForm {...someProps()} />, locale);

    expect(
      screen.getByLabelText(new RegExp(t('compose.doctor').replace('?', '\\?'))),
    ).toBeVisible();
    expect(
      screen.getByRole('group', { name: new RegExp(t('compose.relationship')) }),
    ).toBeVisible();
    expect(screen.getByTestId('compose-title')).toBeVisible();
    expect(screen.getByTestId('compose-body')).toBeVisible();
    expect(screen.getByRole('button', { name: t('compose.identity.pseudo') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('checkbox', { name: t('compose.confirm1') })).not.toBeChecked();
    expect(screen.getByRole('button', { name: t('compose.publish') })).toBeEnabled();
  });

  it('previews a missing sentiment as "Not provided", never as a number', () => {
    renderInLocale(<ComposeForm {...someProps()} />, locale);
    const preview = screen.getByTestId('compose-preview');
    expect(within(preview).getAllByText(t('label.notProvided')).length).toBeGreaterThan(0);
    expect(preview.textContent).not.toMatch(/[0-9০-৯]/);
  });
});

describe('the composer choices', () => {
  beforeEach(() => vi.mocked(publishReview).mockReset());

  it('prefills the doctor from the page and shows them in the preview', () => {
    renderInLocale(
      <ComposeForm {...someProps({ defaults: someDefaults({ doctorId: 'doc-2' }) })} />,
      'en',
    );
    expect(screen.getByTestId('compose-doctor')).toHaveValue('doc-2');
    expect(
      within(screen.getByTestId('compose-preview')).getByText('Dr. Example Sultana'),
    ).toBeVisible();
  });

  it('carries a pressed option in its hidden input, and clears an optional one on a second press', async () => {
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'en');

    await user.click(screen.getByRole('button', { name: 'Parent or guardian' }));
    expect(hiddenValue('relationship')).toBe('parent');

    const positive = screen.getByRole('button', { name: 'Positive' });
    await user.click(positive);
    expect(positive).toHaveAttribute('aria-pressed', 'true');
    expect(hiddenValue('sentiment')).toBe('positive');
    await user.click(positive);
    expect(hiddenValue('sentiment')).toBe('');
  });

  it('switches the previewed byline between the username and the real name', async () => {
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'en');
    const preview = screen.getByTestId('compose-preview');
    expect(within(preview).getByText('abba_of_two')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'My real name' }));
    expect(within(preview).getByText('Abba of Two')).toBeVisible();
    expect(hiddenValue('identity')).toBe('named');
  });

  it('shows the refused fields next to their inputs and keeps what was typed', async () => {
    const refused: ComposeFormState = {
      attempt: 1,
      values: someDefaults({ title: 'Kept title', body: 'Too short' }),
      fieldErrors: {
        body: 'formErrors.compose.bodyTooShort',
        attestation: 'errors.review.attestationRequired',
      },
      formError: 'errors.common.validation',
    };
    vi.mocked(publishReview).mockResolvedValue(refused);
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'en');

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(screen.getByTestId('compose-error')).toHaveFocus());
    expect(screen.getByTestId('compose-title')).toHaveValue('Kept title');
    const body = screen.getByTestId('compose-body');
    expect(body).toHaveAttribute('aria-invalid', 'true');
    expect(body).toHaveAccessibleDescription(/at least 20 characters/);
    expect(screen.getByTestId('compose-attestation')).toHaveAccessibleDescription(
      /genuinely yours/,
    );
    const submitted = vi.mocked(publishReview).mock.calls[0]?.[1];
    expect(submitted?.get('relationship')).toBe('self');
    expect(submitted?.get('attestation')).toBeNull();
  });
});
