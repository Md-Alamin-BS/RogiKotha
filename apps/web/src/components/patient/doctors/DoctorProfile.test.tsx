import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  aDistribution,
  aDoctorProfile,
  anExperienceCard,
  anOutcome,
  aSentiment,
  renderInLocale,
} from './directory-test-support';
import { DoctorProfile } from './DoctorProfile';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

const empty = aSentiment();

describe('DoctorProfile', () => {
  it('renders its blocks in the prototype order', () => {
    renderInLocale('en', <DoctorProfile vm={aDoctorProfile()} filters={{}} threshold={5} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Conditions people wrote about',
      'By condition',
      'Filter these experiences',
      'Patient experiences',
      'About',
      'Practice locations',
      'Where they practise',
    ]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dr. Synthetic Rahman');
  });

  it('marks a member-added doctor with the badge and the why note, and never otherwise', () => {
    const { unmount } = renderInLocale(
      'en',
      <DoctorProfile
        vm={aDoctorProfile({ memberAddedNotConfirmed: true })}
        filters={{}}
        threshold={5}
      />,
    );
    expect(screen.getByTestId('member-added')).toBeInTheDocument();
    expect(screen.getByTestId('member-added-note')).toHaveTextContent('A member added this doctor');
    unmount();

    renderInLocale('en', <DoctorProfile vm={aDoctorProfile()} filters={{}} threshold={5} />);
    expect(screen.queryByTestId('member-added')).toBeNull();
    expect(screen.queryByTestId('member-added-note')).toBeNull();
  });

  it('omits missing facts and reads "Not provided" where a value is absent, never 0', () => {
    const vm = aDoctorProfile({
      facts: [],
      chambers: [],
      conditions: [],
      breakdown: [],
      facilities: [],
      accounts: [],
      accountsTotal: 0,
      scopedSentiment: empty,
      scopedOutcome: anOutcome(),
      scopedTotal: 0,
      showing: 0,
    });
    delete vm.about;
    renderInLocale('en', <DoctorProfile vm={vm} filters={{}} threshold={5} />);

    expect(screen.queryByTestId('fact-fee')).toBeNull();
    expect(screen.getByTestId('doctor-profile-about')).toHaveTextContent('Not provided');
    expect(
      within(screen.getByTestId('doctor-profile-chambers')).getByText('Not provided'),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('dist-not-provided')).toHaveLength(2);
    expect(screen.queryByTestId('profile-breakdown')).toBeNull();
    expect(screen.getByText('No one has written about this doctor yet.')).toBeInTheDocument();
    expect(screen.getByTestId('condition-pill-all')).toHaveTextContent('All conditions (0)');
    expect(screen.queryByTestId('dist-denominator')).toBeNull();
  });

  it('shows each fact with its provenance tag and "No documents" on an account without any', () => {
    renderInLocale('en', <DoctorProfile vm={aDoctorProfile()} filters={{}} threshold={5} />);
    expect(screen.getByTestId('fact-fee')).toHaveTextContent('Community submitted · updated');
    expect(screen.getByTestId('account-row')).toHaveTextContent('No documents');
  });

  it('prints the distributions as counts with "of n", "Not provided: n" and the limited line, never a %', () => {
    const vm = aDoctorProfile({
      accountsTotal: 3,
      accountsLimitedData: true,
      scopedSentiment: aSentiment({ positive: 1 }, { notProvided: 2, limitedData: true }),
      scopedOutcome: anOutcome({ helped: 1 }, { notProvided: 2, limitedData: true }),
    });
    renderInLocale('en', <DoctorProfile vm={vm} filters={{}} threshold={5} />);

    const sentiment = screen.getByTestId('sentiment-block');
    expect(within(sentiment).getByTestId('dist-denominator')).toHaveTextContent(
      'of 1 patient experience',
    );
    expect(within(sentiment).getByTestId('dist-not-provided-count')).toHaveTextContent(
      'Not provided: 2',
    );
    expect(within(sentiment).getByTestId('dist-limited')).toHaveTextContent(
      'Fewer than 5 experiences',
    );
    expect(document.body.textContent).not.toContain('%');
  });

  it('renders the breakdown in Bengali digits with a limited mark per limited row', () => {
    const condition = { publicId: 'c000000001', name: 'ডায়াবেটিস' };
    const vm = aDoctorProfile({
      breakdown: [
        {
          condition,
          sentiment: aDistribution(
            ['positive', 'mixed', 'negative'],
            { positive: 2 },
            { limitedData: true },
          ),
        },
      ],
    });
    renderInLocale('bn', <DoctorProfile vm={vm} filters={{}} threshold={5} />);
    const table = within(screen.getByTestId('profile-breakdown'));
    expect(table.getByRole('row', { name: /ডায়াবেটিস/ })).toHaveTextContent('২');
    expect(table.getByText('সীমিত তথ্য')).toBeInTheDocument();
    expect(table.getByText(/৫টির কম অভিজ্ঞতা/)).toBeInTheDocument();
  });

  it('presses the pills of the active filters and shows "Showing x of y"', () => {
    const vm = aDoctorProfile({
      showing: 2,
      scopedTotal: 6,
      selectedCondition: { publicId: 'c000000001', name: 'Type 2 diabetes' },
    });
    renderInLocale(
      'en',
      <DoctorProfile
        vm={vm}
        filters={{ condition: 'c000000001', outcome: 'helped', docs: true }}
        threshold={5}
      />,
    );
    const pressed = document.querySelectorAll('[aria-current="true"]');
    expect([...pressed].map((a) => a.textContent)).toEqual([
      'Type 2 diabetes (6)',
      'Helped',
      'Has documents',
    ]);
    expect(screen.getByTestId('profile-showing')).toHaveTextContent('Showing 2 of 6');
    expect(screen.getByTestId('condition-pill-all')).toHaveAttribute(
      'href',
      `/doctors/${vm.publicId}?outcome=helped&docs=1`,
    );
  });

  it('never names or links an anonymous author in an account byline', () => {
    const vm = aDoctorProfile({
      accounts: [anExperienceCard({ author: { personaKind: 'anonymous' } })],
    });
    renderInLocale('en', <DoctorProfile vm={vm} filters={{}} threshold={5} />);
    const byline = screen.getByTestId('account-row').querySelector('.byline')!;
    expect(byline.querySelector('a')).toBeNull();
    expect(byline).not.toHaveTextContent('Rina Akter');
  });
});
