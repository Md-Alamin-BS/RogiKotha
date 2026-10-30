import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { DemoOwnReviewRow } from '@rogikotha/contracts';
import { updateDisplayNameAction, updateLanguageAction } from '@/server/actions/profile';
import { ProfileWorkspace } from './ProfileWorkspace';
import { buildOwnReview, buildProfile, loadMessages } from './profile-test-support';

vi.mock('@/server/actions/profile', () => ({
  updateDisplayNameAction: vi.fn(),
  updateLanguageAction: vi.fn(),
}));

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderWorkspace(
  locale: 'en' | 'bn',
  { profile = buildProfile({ locale }), reviews = [] as DemoOwnReviewRow[] } = {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      <ProfileWorkspace profile={profile} reviews={reviews} locale={locale} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the profile workspace', () => {
  it('shows the display name, username, joined date and current language in English', () => {
    renderWorkspace('en');
    const head = screen.getByTestId('profile-head');
    expect(head).toHaveTextContent('Rina Akter · @rina_demo');
    expect(head).toHaveTextContent('Joined 14 March 2026');
    expect(screen.getByTestId('profile-username')).toHaveTextContent('@rina_demo');
    expect(screen.getByTestId('profile-name-input')).toHaveValue('Rina Akter');
    expect(screen.getByTestId('profile-language-en')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('profile-language-bn')).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders in Bengali with Bengali month names and numerals', () => {
    const title = 'কাল্পনিক পরিদর্শন';
    renderWorkspace('bn', { reviews: [buildOwnReview({ title }), buildOwnReview({ title })] });
    expect(screen.getByTestId('profile-head')).toHaveTextContent('যোগ দিয়েছেন ১৪ মার্চ ২০২৬');
    expect(screen.getByTestId('profile-review-count')).toHaveTextContent('২');
    expect(screen.getAllByText(/প্রকাশিত এপ্রিল ২০২৬/)).toHaveLength(2);
    expect(screen.getByTestId('profile-language-bn')).toHaveAttribute('aria-pressed', 'true');
    expect(document.body.textContent).not.toMatch(/[0-9]/);
  });

  it('lists the user’s own experiences in the given order with read and edit links', () => {
    const first = buildOwnReview({ title: 'Newest visit' });
    const second = buildOwnReview({ title: 'Older visit' });
    renderWorkspace('en', { reviews: [first, second] });

    const items = screen.getAllByTestId('profile-review');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Newest visit',
      'Older visit',
    ]);
    expect(within(items[0]!).getByTestId('profile-review-read')).toHaveAttribute(
      'href',
      `/experiences/${first.publicId}`,
    );
    expect(within(items[0]!).getByTestId('profile-review-edit')).toHaveAttribute(
      'href',
      `/experiences/${first.publicId}/edit`,
    );
    expect(items[0]).toHaveTextContent('Dr. Synthetic Example · Published April 2026');
  });

  it('marks an edited experience and offers no links on one that is not public', () => {
    renderWorkspace('en', {
      reviews: [
        buildOwnReview({ title: 'Edited one', edited: true }),
        buildOwnReview({ title: 'Hidden one', state: 'hidden' }),
      ],
    });
    const [edited, hidden] = screen.getAllByTestId('profile-review');
    expect(edited).toHaveTextContent('Edited');
    expect(hidden).toHaveTextContent('Hidden — not shown publicly');
    expect(within(hidden!).queryByTestId('profile-review-edit')).toBeNull();
    expect(within(hidden!).queryByTestId('profile-review-read')).toBeNull();
  });

  it('reads "Not provided" when an experience has no publish date', () => {
    renderWorkspace('en', { reviews: [buildOwnReview({ state: 'other', publishedAt: null })] });
    const item = screen.getByTestId('profile-review');
    expect(item).toHaveTextContent('Not provided');
    expect(item).toHaveTextContent('Not published');
    expect(item).not.toHaveTextContent(/\b0\b/);
  });

  it('invites a user with no experiences to write one', () => {
    renderWorkspace('en');
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.getByTestId('profile-write')).toHaveAttribute('href', '/write');
    expect(screen.getByTestId('profile-review-count')).toHaveTextContent('0');
  });
});

describe('the display-name form', () => {
  it('sends the typed name to the rename action and confirms the save', async () => {
    vi.mocked(updateDisplayNameAction).mockResolvedValue({ status: 'saved', value: 'Rina A.' });
    renderWorkspace('en');
    const input = screen.getByTestId('profile-name-input');

    await userEvent.clear(input);
    await userEvent.type(input, 'Rina A.');
    await userEvent.click(screen.getByTestId('profile-name-submit'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Name saved.'));
    const sent = vi.mocked(updateDisplayNameAction).mock.calls[0]![1];
    expect(sent.get('displayName')).toBe('Rina A.');
  });

  it('shows a refusal next to the field in the active language', async () => {
    vi.mocked(updateDisplayNameAction).mockResolvedValue({
      status: 'error',
      errorKey: 'formErrors.profile.displayNameRequired',
      value: '',
    });
    renderWorkspace('bn');
    await userEvent.clear(screen.getByTestId('profile-name-input'));
    await userEvent.click(screen.getByTestId('profile-name-submit'));

    const input = screen.getByTestId('profile-name-input');
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(document.getElementById('err-profile-displayName')).toHaveTextContent(
      'প্রদর্শিত নাম: যে নাম দেখাতে চান তা লিখুন।',
    );
    expect(input).toHaveAttribute('aria-describedby', 'err-profile-displayName');
  });
});

describe('the language form', () => {
  it('submits the chosen language to the language action', async () => {
    vi.mocked(updateLanguageAction).mockResolvedValue({ status: 'idle' });
    renderWorkspace('en');

    await userEvent.click(screen.getByTestId('profile-language-bn'));

    await waitFor(() => expect(updateLanguageAction).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(updateLanguageAction).mock.calls[0]![1];
    expect(sent.get('locale')).toBe('bn');
  });
});
