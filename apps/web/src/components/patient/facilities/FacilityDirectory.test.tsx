import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { CRITERIA } from '@rogikotha/contracts';
import {
  aFacilityCard,
  aFacilityProfile,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { FacilityIndex } from './FacilityIndex';
import { FacilityProfile } from './FacilityProfile';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

describe('FacilityIndex', () => {
  it('names each branch "name — label" and shows "Part of" only when the parent differs', () => {
    const branch = aFacilityCard();
    const own = aFacilityCard({
      name: 'Synthetic Diagnostic Centre',
      parentName: 'Synthetic Diagnostic Centre',
    });
    const { branchName: _b, ...ownWithoutBranch } = own;
    void _b;
    renderInLocale(
      'en',
      <FacilityIndex cards={[branch, ownWithoutBranch]} total={2} threshold={5} />,
    );

    const [first, second] = screen.getAllByTestId('facility-entry');
    expect(within(first!).getByTestId('facility-link')).toHaveTextContent(
      'Synthetic General Hospital — Dhanmondi branch',
    );
    expect(within(first!).getByTestId('facility-parent')).toHaveTextContent(
      'Part of Synthetic Health Group',
    );
    expect(within(second!).getByTestId('facility-link')).toHaveTextContent(
      'Synthetic Diagnostic Centre',
    );
    expect(within(second!).queryByTestId('facility-parent')).toBeNull();
    expect(within(first!).getByText('Not verified')).toBeInTheDocument();
  });

  it('shows no figures on a card while facility feedback is off', () => {
    const { accountsTotal: _a, accountsLimitedData: _l, overall: _o, ...card } = aFacilityCard();
    void [_a, _l, _o];
    renderInLocale(
      'en',
      <FacilityIndex cards={[{ ...card, feedbackVisible: false }]} total={1} threshold={5} />,
    );
    expect(screen.queryByTestId('facility-visit-count')).toBeNull();
    expect(screen.queryByTestId('facility-entry-limited')).toBeNull();
    expect(screen.queryByTestId('dist-denominator')).toBeNull();
  });

  it('renders in Bengali with Bengali digits', () => {
    renderInLocale('bn', <FacilityIndex cards={[aFacilityCard()]} total={1} threshold={5} />);
    expect(screen.getByTestId('facility-index-count')).toHaveTextContent('১টি শাখা');
    expect(screen.getByText('যাচাই করা হয়নি')).toBeInTheDocument();
    expect(screen.getByTestId('facility-parent')).toHaveTextContent(
      'Synthetic Health Group-এর অংশ',
    );
  });
});

describe('FacilityProfile', () => {
  it('shows the separation callout, one limited line and nine criteria in enum order', () => {
    renderInLocale('en', <FacilityProfile vm={aFacilityProfile()} threshold={5} />);

    expect(screen.getByTestId('facility-separation')).toHaveTextContent(
      'None of it affects any doctor’s summaries.',
    );
    expect(screen.getAllByTestId('facility-limited')).toHaveLength(1);
    const blocks = screen.getByTestId('facility-criteria').querySelectorAll('.crit');
    expect([...blocks].map((b) => b.getAttribute('data-testid'))).toEqual(
      CRITERIA.map((key) => `crit-${key}`),
    );
    expect(
      within(screen.getByTestId('crit-waiting')).getByText('Not provided'),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('crit-staff')).getByTestId('dist-limited')).toHaveTextContent(
      'Limited data',
    );
    expect(document.body.textContent).not.toContain('%');
  });

  it('keeps nine criteria even when every criterion is empty', () => {
    const vm = aFacilityProfile();
    renderInLocale(
      'en',
      <FacilityProfile
        vm={{
          ...vm,
          criteria: vm.criteria.map((c) => ({ key: c.key, dist: { ...c.dist, empty: true } })),
        }}
        threshold={5}
      />,
    );
    expect(screen.getAllByTestId('dist-not-provided')).toHaveLength(9);
  });

  it('lists the other branches, the doctors here and an anonymous visit without a name', () => {
    renderInLocale('en', <FacilityProfile vm={aFacilityProfile()} threshold={5} />);
    const siblings = within(screen.getByTestId('facility-siblings')).getAllByTestId('mini-row');
    expect(siblings.map((s) => s.querySelector('b')?.textContent)).toEqual(['Mirpur branch']);
    expect(screen.getByTestId('facility-doctors')).toHaveTextContent('Dr. Synthetic Haque');
    const visit = screen.getByTestId('facility-visit');
    expect(visit.querySelector('.byline a')).toBeNull();
    expect(visit).toHaveTextContent('Staff behaviour: Good');
  });

  it('reads "Not provided" for a missing address', () => {
    const { address: _a, ...vm } = aFacilityProfile();
    void _a;
    renderInLocale('en', <FacilityProfile vm={vm} threshold={5} />);
    expect(screen.getByTestId('facility-address')).toHaveTextContent('Not provided');
  });

  it('shows no counts, criteria or visits while feedback is off, but keeps separation and branches', () => {
    const { accountsTotal: _a, accountsLimitedData: _l, overall: _o, ...rest } = aFacilityProfile();
    void [_a, _l, _o];
    renderInLocale(
      'en',
      <FacilityProfile
        vm={{ ...rest, feedbackVisible: false, criteria: [], accounts: [] }}
        threshold={5}
      />,
    );
    expect(screen.queryByTestId('facility-profile-count')).toBeNull();
    expect(screen.queryByTestId('facility-criteria')).toBeNull();
    expect(screen.queryByTestId('facility-visit')).toBeNull();
    expect(screen.queryByText('Visits')).toBeNull();
    expect(screen.getByTestId('facility-separation')).toBeInTheDocument();
    expect(screen.getByTestId('facility-siblings')).toBeInTheDocument();
    expect(screen.getByTestId('facility-doctors')).toBeInTheDocument();
  });

  it('renders in Bengali', () => {
    renderInLocale('bn', <FacilityProfile vm={aFacilityProfile()} threshold={5} />);
    expect(
      screen.getByText(
        'এই পাতা শুধু এই প্রতিষ্ঠানের সেবা নিয়ে। এর কোনো কিছুই কোনো ডাক্তারের সারাংশে প্রভাব ফেলে না।',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('facility-profile-count')).toHaveTextContent('২টি যাওয়ার বর্ণনা');
  });
});
