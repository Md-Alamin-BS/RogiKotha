import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderInLocale } from './directory-test-support';
import { ProfileFilters } from './ProfileFilters';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

const announce = vi.hoisted(() => vi.fn());
vi.mock('@/lib/announce', () => ({ useAnnounce: () => announce }));

const props = {
  publicId: 'd000000001',
  outcomes: [
    { value: 'helped' as const, label: 'Helped' },
    { value: 'worse' as const, label: 'Worsened' },
  ],
  relationships: [{ value: 'self' as const, label: 'The patient' }],
  labels: {
    outcomeGroup: 'Reported outcome',
    relationshipGroup: 'Who wrote it',
    documentsGroup: 'Documents',
    hasDocuments: 'Has documents',
  },
};

describe('ProfileFilters', () => {
  it('links each pill to the URL with that filter toggled and the others kept', () => {
    renderInLocale(
      'en',
      <ProfileFilters
        {...props}
        filters={{ condition: 'c000000001', outcome: 'helped' }}
        showing={2}
        showingText="Showing 2 of 6"
      />,
    );
    expect(screen.getByTestId('filter-pill-outcome-helped')).toHaveAttribute(
      'href',
      '/doctors/d000000001?condition=c000000001',
    );
    expect(screen.getByTestId('filter-pill-outcome-helped')).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByTestId('filter-pill-outcome-worse')).toHaveAttribute(
      'href',
      '/doctors/d000000001?condition=c000000001&outcome=worse',
    );
    expect(screen.getByTestId('filter-pill-docs')).toHaveAttribute(
      'href',
      '/doctors/d000000001?condition=c000000001&outcome=helped&docs=1',
    );
    expect(screen.getByTestId('filter-pill-relationship-self')).not.toHaveAttribute('aria-current');
  });

  it('announces a new count once, and nothing on first render', () => {
    announce.mockClear();
    // The filters carry no messages of their own, so they render without the intl provider and a
    // rerender updates the same instance.
    const { rerender } = render(
      <ProfileFilters {...props} filters={{}} showing={6} showingText="Showing 6 of 6" />,
    );
    expect(announce).not.toHaveBeenCalled();

    rerender(
      <ProfileFilters
        {...props}
        filters={{ outcome: 'helped' }}
        showing={2}
        showingText="Showing 2 of 6"
      />,
    );
    rerender(
      <ProfileFilters
        {...props}
        filters={{ outcome: 'helped' }}
        showing={2}
        showingText="Showing 2 of 6"
      />,
    );
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Showing 2 of 6');
  });
});
