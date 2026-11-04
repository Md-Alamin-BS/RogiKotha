import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { QUALITY_SCORE_PATTERN, buildDoctorRow, renderInLocale } from './directory-test-support';
import { DoctorList } from './DoctorList';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('DoctorList', () => {
  it('keeps the neutral order the data layer gives and links each doctor to their profile', () => {
    const busy = buildDoctorRow({ name: 'Dr. Zahid Busy', publishedReviewCount: 4 });
    const quiet = buildDoctorRow({ name: 'Dr. Anika Quiet', publishedReviewCount: 1 });
    renderInLocale('en', <DoctorList doctors={[busy, quiet]} />);

    const links = screen.getAllByTestId('doctor-entry-link');
    expect(links.map((a) => a.textContent)).toEqual(['Dr. Zahid Busy', 'Dr. Anika Quiet']);
    expect(links[0]).toHaveAttribute('href', `/doctors/${busy.publicId}`);
  });

  it('shows "Registration not verified" and the count of published experiences on every doctor', () => {
    const doctors = [
      buildDoctorRow({ publishedReviewCount: 1 }),
      buildDoctorRow({ publishedReviewCount: 0 }),
    ];
    renderInLocale('en', <DoctorList doctors={doctors} />);

    const entries = screen.getAllByTestId('doctor-entry');
    for (const entry of entries) {
      expect(within(entry).getByText('Registration not verified')).toBeInTheDocument();
    }
    expect(within(entries[0]!).getByTestId('doctor-entry-count')).toHaveTextContent(
      '1 patient experience',
    );
    expect(within(entries[1]!).getByTestId('doctor-entry-count')).toHaveTextContent(
      '0 patient experiences',
    );
    expect(screen.getByTestId('doctor-list-count')).toHaveTextContent('2 doctors');
  });

  it('reads "Not provided" for a missing specialty and place', () => {
    renderInLocale(
      'en',
      <DoctorList doctors={[buildDoctorRow({ specialty: null, city: null, area: null })]} />,
    );

    expect(document.querySelector('.doc-sub')).toHaveTextContent('Not provided · Not provided');
  });

  it('shows no star, score or rating anywhere', () => {
    renderInLocale('en', <DoctorList doctors={[buildDoctorRow(), buildDoctorRow()]} />);

    expect(document.body.textContent).not.toMatch(QUALITY_SCORE_PATTERN);
  });

  it('explains an empty directory instead of showing a blank list', () => {
    renderInLocale('en', <DoctorList doctors={[]} />);

    expect(screen.getByText('Nothing matched yet')).toBeInTheDocument();
    expect(screen.queryByTestId('doctor-entry')).toBeNull();
  });

  it('renders in Bengali with Bengali numerals', () => {
    const doctor = buildDoctorRow({
      name: 'ডা. ফারহানা রহমান',
      specialty: 'এন্ডোক্রিনোলজি',
      city: 'ঢাকা',
      area: 'ধানমন্ডি',
      publishedReviewCount: 12,
    });
    renderInLocale('bn', <DoctorList doctors={[doctor]} />);

    expect(screen.getByText('রেজিস্ট্রেশন যাচাই করা হয়নি')).toBeInTheDocument();
    expect(screen.getByTestId('doctor-entry-count')).toHaveTextContent('১২টি রোগীর অভিজ্ঞতা');
    expect(screen.getByTestId('doctor-list-count')).toHaveTextContent('১ জন ডাক্তার');
    expect(document.body.textContent).not.toMatch(/[0-9]/);
  });

  it('marks a member-added doctor as not confirmed, in both languages, and no other doctor', () => {
    const added = buildDoctorRow({ name: 'Dr. Typed In', memberAdded: true });
    const seeded = buildDoctorRow({ name: 'Dr. Seeded' });
    renderInLocale('en', <DoctorList doctors={[added, seeded]} />);
    const entries = screen.getAllByTestId('doctor-entry');
    expect(within(entries[0]!).getByTestId('member-added')).toHaveTextContent(
      'Added by a member — not confirmed',
    );
    expect(within(entries[0]!).getByTestId('not-verified')).toBeVisible();
    expect(within(entries[1]!).queryByTestId('member-added')).toBeNull();
  });

  it('marks a member-added doctor in Bengali', () => {
    renderInLocale('bn', <DoctorList doctors={[buildDoctorRow({ memberAdded: true })]} />);
    expect(screen.getByTestId('member-added')).toHaveTextContent('সদস্যের যোগ করা — নিশ্চিত নয়');
  });
});
