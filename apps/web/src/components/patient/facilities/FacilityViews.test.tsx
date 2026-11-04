import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  QUALITY_SCORE_PATTERN,
  buildFacilityDetail,
  buildFacilityRow,
  loadMessages,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { FacilityList } from './FacilityList';
import { FacilityProfile } from './FacilityProfile';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function message(locale: 'en' | 'bn', key: string): string {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      loadMessages(locale),
    ) as string;
}

describe('FacilityList', () => {
  it('lists each branch as "Facility — Branch" in the order given, linked to its page', () => {
    const group = buildFacilityRow({
      facilityName: 'Shefa Synthetic Group',
      branchName: 'Uttara branch',
    });
    const single = buildFacilityRow({ facilityName: 'Prottasha Synthetic Clinic', type: 'clinic' });
    renderInLocale('en', <FacilityList facilities={[group, single]} />);

    const links = screen.getAllByTestId('facility-entry-link');
    expect(links.map((a) => a.textContent)).toEqual([
      'Shefa Synthetic Group — Uttara branch',
      'Prottasha Synthetic Clinic',
    ]);
    expect(links[0]).toHaveAttribute('href', `/facilities/${group.publicId}`);
    expect(screen.getAllByTestId('facility-visit-count')[0]).toHaveTextContent(
      '2 visits described',
    );
  });

  it('shows no star, score or rating, and says the list is never ranked', () => {
    renderInLocale('en', <FacilityList facilities={[buildFacilityRow()]} />);
    expect(document.body.textContent).not.toMatch(QUALITY_SCORE_PATTERN);
    expect(screen.getByText(message('en', 'facility.orderNote'))).toBeVisible();
  });

  it('reads "Not provided" for a branch with no place', () => {
    renderInLocale(
      'en',
      <FacilityList facilities={[buildFacilityRow({ city: null, area: null })]} />,
    );
    expect(within(screen.getByTestId('facility-entry')).getByText(/Not provided/)).toBeVisible();
  });

  it('renders in Bengali with Bengali numerals', () => {
    renderInLocale('bn', <FacilityList facilities={[buildFacilityRow({ visitCount: 3 })]} />);
    expect(screen.getByTestId('facility-visit-count')).toHaveTextContent('৩টি যাওয়ার বর্ণনা');
    expect(screen.getByTestId('facility-list-count')).toHaveTextContent('১টি শাখা');
  });
});

describe.each(['en', 'bn'] as const)('FacilityProfile in %s', (locale) => {
  it('shows the separation notice, each visit with its answered criteria and the doctors here', () => {
    renderInLocale(locale, <FacilityProfile facility={buildFacilityDetail()} />);

    expect(screen.getByTestId('facility-separation')).toHaveTextContent(
      message(locale, 'facility.separation'),
    );
    const visit = screen.getByTestId('facility-visit');
    expect(visit).toHaveTextContent(message(locale, 'crit.staff'));
    expect(visit).toHaveTextContent(message(locale, 'crit.mixed'));
    expect(
      within(screen.getByTestId('facility-doctors')).getByText('Dr. Synthetic Haque'),
    ).toBeVisible();
    expect(screen.getByText(message(locale, 'facility.doctorsNote'))).toBeVisible();
    expect(document.body.textContent).not.toMatch(QUALITY_SCORE_PATTERN);
  });

  it('says so when nobody has described a visit, and reads "Not provided" for a missing address', () => {
    renderInLocale(
      locale,
      <FacilityProfile facility={buildFacilityDetail({ visits: [], visitCount: 0 })} />,
    );
    expect(screen.getByText(message(locale, 'facility.noVisits'))).toBeVisible();
    expect(screen.getAllByText(message(locale, 'label.notProvided')).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('facility-visit')).toBeNull();
  });
});
