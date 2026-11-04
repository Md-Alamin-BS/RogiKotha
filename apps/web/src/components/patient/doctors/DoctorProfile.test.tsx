import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  QUALITY_SCORE_PATTERN,
  buildDoctorDetail,
  buildReviewCard,
  renderInLocale,
} from './directory-test-support';
import { DoctorProfile } from './DoctorProfile';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('DoctorProfile', () => {
  it('heads the page with the doctor’s name, "Registration not verified" and the count', () => {
    const doctor = buildDoctorDetail({ name: 'Dr. Farhana Synthetic', publishedReviewCount: 4 });
    renderInLocale('en', <DoctorProfile doctor={doctor} experiences={[]} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dr. Farhana Synthetic');
    expect(screen.getByText('Registration not verified')).toBeInTheDocument();
    expect(screen.getByTestId('doctor-profile-count')).toHaveTextContent('4 patient experiences');
  });

  it('links "Write about this doctor" to the write form for this doctor', () => {
    const doctor = buildDoctorDetail();
    renderInLocale('en', <DoctorProfile doctor={doctor} experiences={[]} />);

    expect(screen.getByRole('link', { name: 'Write about this doctor' })).toHaveAttribute(
      'href',
      `/write?doctor=${doctor.publicId}`,
    );
  });

  it('lists the published experiences in the order given, without repeating the doctor link', () => {
    const doctor = buildDoctorDetail();
    const newer = buildReviewCard({ title: 'Newer visit' });
    const older = buildReviewCard({ title: 'Older visit' });
    renderInLocale('en', <DoctorProfile doctor={doctor} experiences={[newer, older]} />);

    const titles = screen.getAllByTestId('experience-row-title-link').map((a) => a.textContent);
    expect(titles).toEqual(['Newer visit', 'Older visit']);
    expect(screen.queryByTestId('experience-row-doctor-link')).toBeNull();
  });

  it('says so when no one has written about the doctor yet', () => {
    renderInLocale('en', <DoctorProfile doctor={buildDoctorDetail()} experiences={[]} />);

    expect(screen.getByText('No one has written about this doctor yet.')).toBeInTheDocument();
  });

  it('reads "Not provided" for every missing fact, chamber hour and an empty chamber list', () => {
    const doctor = buildDoctorDetail({
      about: null,
      specialty: null,
      qualifications: null,
      languages: null,
      feeDisplay: null,
      chambers: [],
    });
    renderInLocale('en', <DoctorProfile doctor={doctor} experiences={[]} />);

    const facts = screen.getByTestId('doctor-profile-facts');
    // About, specialty, qualifications, languages and fee.
    expect(within(facts).getAllByText('Not provided')).toHaveLength(5);
    expect(document.querySelectorAll('.panel .note')[1]).toHaveTextContent('Not provided');
  });

  it('shows each chamber with its hours, and "Not provided" for unknown hours', () => {
    const doctor = buildDoctorDetail({
      chambers: [
        { name: 'Synthetic Clinic', hours: 'Thu, 4–7 pm' },
        { name: 'Synthetic Hospital', hours: null },
      ],
    });
    renderInLocale('en', <DoctorProfile doctor={doctor} experiences={[]} />);

    expect(screen.getByText('Thu, 4–7 pm')).toBeInTheDocument();
    const hospital = screen.getByText('Synthetic Hospital').closest('li')!;
    expect(hospital).toHaveTextContent('Not provided');
  });

  it('shows no star, score or rating anywhere', () => {
    renderInLocale(
      'en',
      <DoctorProfile doctor={buildDoctorDetail()} experiences={[buildReviewCard()]} />,
    );

    expect(document.body.textContent).not.toMatch(QUALITY_SCORE_PATTERN);
  });

  it('renders in Bengali with Bengali numerals', () => {
    const doctor = buildDoctorDetail({
      name: 'ডা. ফারহানা রহমান',
      specialty: 'এন্ডোক্রিনোলজি',
      qualifications: 'এমবিবিএস',
      city: 'ঢাকা',
      area: 'ধানমন্ডি',
      languages: 'বাংলা',
      feeDisplay: '৳ ১২০০',
      about: null,
      chambers: [{ name: 'শেফা জেনারেল হাসপাতাল', hours: null }],
      publishedReviewCount: 3,
    });
    renderInLocale('bn', <DoctorProfile doctor={doctor} experiences={[]} />);

    expect(screen.getByRole('link', { name: 'এই ডাক্তারকে নিয়ে লিখুন' })).toBeInTheDocument();
    expect(screen.getByTestId('doctor-profile-count')).toHaveTextContent('৩টি রোগীর অভিজ্ঞতা');
    expect(screen.getAllByText('জানানো হয়নি').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/[0-9]/);
  });
});
