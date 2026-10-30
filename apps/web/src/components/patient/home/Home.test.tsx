import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { EmergencyConfig } from '@/components/patient/Emergency';
import {
  buildReviewCard,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { Home } from './Home';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const EMERGENCY: EmergencyConfig = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
  lastVerified: '2026-08-21',
};

describe('Home', () => {
  it('shows the latest experiences in the order given, each linking to its page', () => {
    const newer = buildReviewCard({ title: 'Newest visit' });
    const older = buildReviewCard({ title: 'Older visit' });
    renderInLocale('en', <Home latest={[newer, older]} emergency={EMERGENCY} />);

    const titles = screen.getAllByTestId('experience-row-title-link').map((a) => a.textContent);
    expect(titles).toEqual(['Newest visit', 'Older visit']);
    expect(screen.getByRole('link', { name: 'Newest visit' })).toHaveAttribute(
      'href',
      `/experiences/${newer.publicId}`,
    );
  });

  it('links to the doctors list and to writing', () => {
    renderInLocale('en', <Home latest={[]} emergency={EMERGENCY} />);

    expect(screen.getByRole('link', { name: 'Browse doctors' })).toHaveAttribute(
      'href',
      '/doctors',
    );
    expect(screen.getByRole('link', { name: 'Share your experience' })).toHaveAttribute(
      'href',
      '/write',
    );
  });

  it('keeps the disclaimer and the emergency numbers on the page', () => {
    renderInLocale('en', <Home latest={[]} emergency={EMERGENCY} />);

    expect(
      screen.getByText('Patient-reported experiences. Not medical advice.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('home-emergency-ambulance')).toHaveAttribute('href', 'tel:999');
    expect(screen.getByTestId('home-emergency-crisis')).toHaveAttribute('href', 'tel:09612-119911');
    expect(screen.getByText('Last verified 21 August 2026')).toBeInTheDocument();
  });

  it('says so when nothing has been published yet', () => {
    renderInLocale('en', <Home latest={[]} emergency={EMERGENCY} />);

    expect(screen.getByText('No experiences have been published yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('experience-row')).toBeNull();
  });

  it('renders in Bengali with Bengali numerals for the emergency lines', () => {
    renderInLocale('bn', <Home latest={[buildReviewCard()]} emergency={EMERGENCY} />);

    expect(screen.getByRole('link', { name: 'ডাক্তারদের তালিকা দেখুন' })).toBeInTheDocument();
    expect(screen.getByTestId('home-emergency-ambulance')).toHaveTextContent('৯৯৯');
    expect(screen.getByTestId('home-emergency-crisis')).toHaveTextContent('০৯৬১২-১১৯৯১১');
    expect(screen.getAllByTestId('experience-row')).toHaveLength(1);
  });
});
