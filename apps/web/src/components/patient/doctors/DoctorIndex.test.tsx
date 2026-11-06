import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  QUALITY_SCORE_PATTERN,
  aDoctorCard,
  aSentiment,
  renderInLocale,
} from './directory-test-support';
import { DoctorIndex } from './DoctorIndex';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

describe('DoctorIndex', () => {
  it('lists the cards in the order the query gives and marks every doctor not verified', () => {
    const zahid = aDoctorCard({ name: 'Dr. Zahid Synthetic' });
    const anika = aDoctorCard({ name: 'Dr. Anika Synthetic' });
    renderInLocale('en', <DoctorIndex cards={[zahid, anika]} total={2} threshold={5} />);

    const links = screen.getAllByTestId('doctor-link');
    expect(links.map((a) => a.textContent)).toEqual(['Dr. Zahid Synthetic', 'Dr. Anika Synthetic']);
    expect(links[0]).toHaveAttribute('href', `/doctors/${zahid.publicId}`);
    for (const entry of screen.getAllByTestId('doctor-entry')) {
      expect(within(entry).getByText('Registration not verified')).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Doctors');
    expect(screen.getByTestId('doctor-index-count')).toHaveTextContent('2 doctors');
  });

  it('renders in Bengali with Bengali digits and the Bengali not-verified label', () => {
    const card = aDoctorCard({
      sentiment: aSentiment({ positive: 12 }),
      topConditions: [{ publicId: 'c000000001', name: 'ডায়াবেটিস', count: 3 }],
    });
    renderInLocale('bn', <DoctorIndex cards={[card]} total={12} threshold={5} />);

    expect(screen.getByTestId('doctor-index-count')).toHaveTextContent('১২ জন ডাক্তার');
    expect(screen.getByText('রেজিস্ট্রেশন যাচাই করা হয়নি')).toBeInTheDocument();
    expect(screen.getByTestId('doctor-entry-treats')).toHaveTextContent('ডায়াবেটিস (৩)');
    expect(document.body.textContent).not.toMatch(/[0-9]/);
  });

  it('shows the member-added mark only on a marked card', () => {
    const marked = aDoctorCard({ memberAddedNotConfirmed: true });
    const plain = aDoctorCard();
    renderInLocale('en', <DoctorIndex cards={[marked, plain]} total={2} threshold={5} />);

    const [first, second] = screen.getAllByTestId('doctor-entry');
    expect(within(first!).getByTestId('member-added')).toHaveTextContent(
      'Added by a member — not confirmed',
    );
    expect(within(second!).queryByTestId('member-added')).toBeNull();
  });

  it('shows "No documents", Limited data and a compact count line without a percentage or score', () => {
    const card = aDoctorCard({ documentsCount: 0, accountsLimitedData: true, topConditions: [] });
    renderInLocale('en', <DoctorIndex cards={[card]} total={1} threshold={5} />);

    expect(screen.getByTestId('doctor-entry-documents')).toHaveTextContent('No documents');
    expect(screen.getByTestId('doctor-entry-limited')).toHaveTextContent('Limited data');
    expect(screen.queryByTestId('doctor-entry-treats')).toBeNull();
    expect(screen.getByTestId('dist-denominator')).toHaveTextContent('of 6 patient experiences');
    expect(document.body.textContent).not.toContain('%');
    expect(document.body.textContent).not.toMatch(QUALITY_SCORE_PATTERN);
  });

  it('shows the empty state when no doctor is listed', () => {
    renderInLocale('en', <DoctorIndex cards={[]} total={0} threshold={5} />);
    expect(screen.getByText('Nothing matched yet')).toBeInTheDocument();
  });
});
