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
    newDoctor: '',
    newDoctorName: '',
    newDoctorSpecialtyId: '',
    newDoctorChamber: '',
    newDoctorBmdc: '',
    ...overrides,
  };
}

function someProps(overrides: Partial<ComposeFormProps> = {}): ComposeFormProps {
  return {
    doctors: [
      { id: 'doc-1', label: 'Dr. Synthetic Rahman — Paediatrics' },
      { id: 'doc-2', label: 'Dr. Example Sultana' },
    ],
    specialties: [{ id: '0190a0b0-0000-7000-8000-000000000001', name: 'Paediatrics' }],
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

  it('keeps the chosen doctor and the ticked attestation after a refusal, and lists the refused fields', async () => {
    vi.mocked(publishReview).mockResolvedValue({
      attempt: 1,
      values: someDefaults({ doctorId: 'doc-2', body: 'Very good doctor', attestation: 'on' }),
      fieldErrors: { body: 'formErrors.compose.bodyTooShort' },
      formError: 'errors.common.validation',
    });
    const user = userEvent.setup();
    renderInLocale(
      <ComposeForm {...someProps({ defaults: someDefaults({ doctorId: 'doc-2' }) })} />,
      'en',
    );

    await user.click(screen.getByTestId('compose-attestation'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(screen.getByTestId('compose-error')).toHaveFocus());
    expect(screen.getByTestId('compose-doctor')).toHaveValue('doc-2');
    expect(screen.getByTestId('compose-attestation')).toBeChecked();
    expect(
      within(screen.getByTestId('compose-error-fields')).getByText('What happened?'),
    ).toBeVisible();
  });

  it('counts the story while it is shorter than the minimum, then hides the count', async () => {
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'en');
    const body = screen.getByTestId('compose-body');

    await user.type(body, 'Very good doctor');
    expect(screen.getByTestId('compose-body-count')).toHaveTextContent(
      '16 of at least 20 characters',
    );
    expect(body).toHaveAccessibleDescription(/16 of at least 20/);

    await user.type(body, ' indeed');
    expect(screen.queryByTestId('compose-body-count')).toBeNull();
  });

  it('opens the add-a-doctor panel, previews the typed name and sends it instead of a listed doctor', async () => {
    vi.mocked(publishReview).mockResolvedValue({
      attempt: 1,
      values: null,
      fieldErrors: {},
      formError: 'errors.common.internal',
    });
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'en');

    await user.click(screen.getByTestId('compose-add-doctor-open'));
    expect(screen.queryByTestId('compose-doctor')).toBeNull();
    expect(screen.getByTestId('compose-add-doctor-note')).toHaveTextContent(
      'Added by a member — not confirmed',
    );
    await user.type(screen.getByTestId('compose-newDoctorName'), 'Dr. Synthetic Karim');
    await user.selectOptions(screen.getByTestId('compose-newDoctorSpecialtyId'), 'Paediatrics');
    expect(
      within(screen.getByTestId('compose-preview')).getByText('Dr. Synthetic Karim'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const submitted = vi.mocked(publishReview).mock.calls[0]?.[1];
    expect(submitted?.get('newDoctor')).toBe('1');
    expect(submitted?.get('newDoctorName')).toBe('Dr. Synthetic Karim');
    expect(submitted?.get('newDoctorSpecialtyId')).toBe('0190a0b0-0000-7000-8000-000000000001');
    expect(submitted?.get('doctorId')).toBeNull();
  });

  it('goes back to the doctor list from the add-a-doctor panel', async () => {
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'en');
    await user.click(screen.getByTestId('compose-add-doctor-open'));
    await user.click(screen.getByTestId('compose-add-doctor-cancel'));
    expect(screen.getByTestId('compose-doctor')).toBeVisible();
    expect(hiddenValue('newDoctor')).toBe('');
  });

  it('labels the add-a-doctor panel in Bengali', async () => {
    const t = translatorFor('bn');
    const user = userEvent.setup();
    renderInLocale(<ComposeForm {...someProps()} />, 'bn');
    await user.click(screen.getByRole('button', { name: t('compose.addDoctor') }));
    expect(screen.getByLabelText(new RegExp(t('compose.addName')))).toBeVisible();
    expect(screen.getByTestId('compose-add-doctor-note')).toHaveTextContent(t('compose.addNote'));
  });
});
