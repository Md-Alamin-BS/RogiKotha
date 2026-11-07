import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EditReviewVM } from '@rogikotha/contracts';
import { correctReviewAction, type CorrectFormState } from '@/server/actions/review-edit';
import { EditForm } from './EditForm';
import { renderInLocale, translatorFor, type TestLocale } from './compose-test-support';

vi.mock('@/server/actions/review-edit', () => ({ correctReviewAction: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function aQuickVm(overrides: Partial<EditReviewVM> = {}): EditReviewVM {
  return {
    publicId: 'a1b2c3d4e5',
    kind: 'quick',
    version: 3,
    title: 'Calm and careful with my son',
    story: 'She listened to every question and explained the doses slowly.',
    sentiment: 'positive',
    claims: [],
    doctorName: 'Dr. Synthetic Rahman',
    ...overrides,
  };
}

function aDetailedVm(overrides: Partial<EditReviewVM> = {}): EditReviewVM {
  return {
    publicId: 'a1b2c3d4e5',
    kind: 'detailed',
    version: 2,
    title: 'Three weeks of follow-up',
    sections: { symptoms: 'A cough that lasted weeks.', treatment: 'Two courses of tablets.' },
    claims: [],
    doctorName: 'Dr. Synthetic Rahman',
    ...overrides,
  };
}

function aRefusal(overrides: Partial<CorrectFormState>): CorrectFormState {
  return { attempt: 1, values: null, fieldErrors: {}, formError: null, ...overrides };
}

const BLANK_VALUES = {
  title: '',
  story: '',
  symptoms: '',
  diagnosis: '',
  treatment: '',
  after: '',
  sentiment: '',
  outcome: '',
  claims: [],
};

beforeEach(() => vi.mocked(correctReviewAction).mockReset());

describe.each(['en', 'bn'] as const)('the edit form in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('opens a quick experience with its title, story, answers and hidden version fields', () => {
    const { container } = renderInLocale(<EditForm vm={aQuickVm()} />, locale);

    expect(screen.getByTestId('compose-title')).toHaveValue('Calm and careful with my son');
    expect(screen.getByTestId('compose-story')).toHaveValue(
      'She listened to every question and explained the doses slowly.',
    );
    expect(screen.queryByTestId('compose-sections')).toBeNull();
    expect(screen.getByRole('button', { name: t('sentiment.positive') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const hidden = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;
    expect(hidden('publicId')).toBe('a1b2c3d4e5');
    expect(hidden('expectedVersion')).toBe('3');
    expect(hidden('kind')).toBe('quick');
    expect(screen.getByText(t('compose.edit.versionNote'))).toBeInTheDocument();
    expect(screen.getByText(t('compose.edit.correctionNote'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('compose.edit.save') })).toBeEnabled();
    expect(screen.getByTestId('edit-cancel')).toHaveAttribute('href', '/experiences/a1b2c3d4e5');
  });

  it('opens a detailed experience with the four sections and no single story field', () => {
    renderInLocale(<EditForm vm={aDetailedVm()} />, locale);

    expect(screen.queryByTestId('compose-story')).toBeNull();
    expect(screen.getByTestId('compose-symptoms')).toHaveValue('A cough that lasted weeks.');
    expect(screen.getByTestId('compose-diagnosis')).toHaveValue('');
    expect(screen.getByTestId('compose-treatment')).toHaveValue('Two courses of tablets.');
    expect(screen.getByTestId('compose-after')).toHaveValue('');
    expect(screen.getByLabelText(new RegExp(t('compose.symptoms')))).toBeInTheDocument();
  });

  it('reads "Not provided" when the doctor cannot be shown', () => {
    renderInLocale(<EditForm vm={aQuickVm({ doctorName: null })} />, locale);
    expect(screen.getByTestId('edit-doctor')).toHaveTextContent(t('label.notProvided'));
  });

  it('offers the three reviewer labels and keeps a stored label as a checked, removable box', () => {
    renderInLocale(
      <EditForm vm={aQuickVm({ claims: ['wrongDx', 'Told to stop the tablets early'] })} />,
      locale,
    );

    expect(screen.getByRole('checkbox', { name: t('claim.wrongDx') })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: t('claim.wrongRx') })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: t('claim.secondOpinion') })).not.toBeChecked();
    const stored = screen.getByRole('checkbox', { name: 'Told to stop the tablets early' });
    expect(stored).toBeChecked();
    expect(stored).toHaveAttribute('value', 'Told to stop the tablets early');
  });

  it('shows field errors beside the story, the sections and the labels', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({
        formError: 'errors.common.validation',
        fieldErrors: { story: 'errors.review.missingStory' },
        values: { ...BLANK_VALUES, title: 'Typed title' },
      }),
    );
    const user = userEvent.setup();
    renderInLocale(<EditForm vm={aQuickVm()} />, locale);
    await user.click(screen.getByRole('button', { name: t('compose.edit.save') }));

    await waitFor(() =>
      expect(screen.getByTestId('compose-error')).toHaveTextContent(t('errors.common.validation')),
    );
    expect(screen.getByText(t('errors.review.missingStory'))).toBeInTheDocument();
    // The values typed before the refusal stay, not the stored ones.
    expect(screen.getByTestId('compose-title')).toHaveValue('Typed title');
  });

  it('shows the section error of a detailed experience', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({
        formError: 'errors.common.validation',
        fieldErrors: { story: 'errors.review.missingStory' },
        values: { ...BLANK_VALUES },
      }),
    );
    const user = userEvent.setup();
    renderInLocale(<EditForm vm={aDetailedVm()} />, locale);
    await user.click(screen.getByRole('button', { name: t('compose.edit.save') }));

    expect(await screen.findByText(t('errors.review.missingStory'))).toBeInTheDocument();
    expect(screen.getByTestId('compose-symptoms')).toHaveValue('');
  });

  it('shows the conflict message with a link that reloads the latest version', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({ formError: 'errors.review.editConflict', conflict: true }),
    );
    const user = userEvent.setup();
    renderInLocale(<EditForm vm={aQuickVm()} />, locale);
    await user.click(screen.getByRole('button', { name: t('compose.edit.save') }));

    await waitFor(() =>
      expect(screen.getByTestId('compose-error')).toHaveTextContent(
        t('errors.review.editConflict'),
      ),
    );
    const reload = screen.getByTestId('edit-reload');
    expect(reload).toHaveTextContent(t('compose.edit.reload'));
    expect(reload).toHaveAttribute('href', '/experiences/a1b2c3d4e5/edit');
  });

  it('shows the daily limit message without a reload link', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({ formError: 'errors.review.correctionsLimit', retryAfterSec: 3600 }),
    );
    const user = userEvent.setup();
    renderInLocale(<EditForm vm={aQuickVm()} />, locale);
    await user.click(screen.getByRole('button', { name: t('compose.edit.save') }));

    await waitFor(() =>
      expect(screen.getByTestId('compose-error')).toHaveTextContent(
        t('errors.review.correctionsLimit'),
      ),
    );
    expect(screen.queryByTestId('edit-reload')).toBeNull();
  });
});

describe('saving an edit', () => {
  it('sends the ids, the version and the fields exactly as shown, labels included', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({ formError: 'errors.common.internal' }),
    );
    const user = userEvent.setup();
    renderInLocale(
      <EditForm vm={aQuickVm({ claims: ['wrongRx', 'Told to stop the tablets early'] })} />,
      'en',
    );

    await user.click(screen.getByRole('button', { name: 'Mixed' }));
    await user.click(screen.getByRole('checkbox', { name: 'Second opinion differed' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(correctReviewAction).toHaveBeenCalled());
    const submitted = vi.mocked(correctReviewAction).mock.calls[0]?.[1];
    expect(submitted?.get('publicId')).toBe('a1b2c3d4e5');
    expect(submitted?.get('expectedVersion')).toBe('3');
    expect(submitted?.get('kind')).toBe('quick');
    expect(submitted?.get('sentiment')).toBe('mixed');
    expect(submitted?.get('title')).toBe('Calm and careful with my son');
    expect(submitted?.getAll('claims')).toEqual([
      'wrongRx',
      'secondOpinion',
      'Told to stop the tablets early',
    ]);
  });

  it('drops a label the author unchecked and a sentiment they cleared', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({ formError: 'errors.common.internal' }),
    );
    const user = userEvent.setup();
    renderInLocale(
      <EditForm vm={aQuickVm({ claims: ['Told to stop the tablets early'] })} />,
      'en',
    );

    await user.click(screen.getByRole('checkbox', { name: 'Told to stop the tablets early' }));
    await user.click(screen.getByRole('button', { name: 'Positive' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(correctReviewAction).toHaveBeenCalled());
    const submitted = vi.mocked(correctReviewAction).mock.calls[0]?.[1];
    expect(submitted?.getAll('claims')).toEqual([]);
    expect(submitted?.get('sentiment')).toBe('');
  });

  it('sends the four sections of a detailed experience', async () => {
    vi.mocked(correctReviewAction).mockResolvedValue(
      aRefusal({ formError: 'errors.common.internal' }),
    );
    const user = userEvent.setup();
    renderInLocale(<EditForm vm={aDetailedVm()} />, 'en');

    await user.type(screen.getByTestId('compose-after'), 'Much better now.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(correctReviewAction).toHaveBeenCalled());
    const submitted = vi.mocked(correctReviewAction).mock.calls[0]?.[1];
    expect(submitted?.get('kind')).toBe('detailed');
    expect(submitted?.get('symptoms')).toBe('A cough that lasted weeks.');
    expect(submitted?.get('after')).toBe('Much better now.');
    expect(submitted?.get('story')).toBeNull();
  });
});
