import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  buildReviewCard,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { ExperienceRow, initialsFor } from './ExperienceRow';

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('ExperienceRow', () => {
  it('links the title to the experience page and names the doctor with a link to their profile', () => {
    const review = buildReviewCard();
    renderInLocale('en', <ExperienceRow review={review} />);

    expect(screen.getByRole('link', { name: review.title })).toHaveAttribute(
      'href',
      `/experiences/${review.publicId}`,
    );
    expect(screen.getByRole('link', { name: review.doctor.name })).toHaveAttribute(
      'href',
      `/doctors/${review.doctor.publicId}`,
    );
    expect(screen.getByRole('link', { name: 'Read in full' })).toHaveAttribute(
      'href',
      `/experiences/${review.publicId}`,
    );
  });

  it('shows the author, their identity mode, relationship and the treatment period', () => {
    renderInLocale('en', <ExperienceRow review={buildReviewCard()} />);

    const byline = document.querySelector('.byline')!;
    expect(within(byline as HTMLElement).getByText('Rina Akter')).toBeInTheDocument();
    expect(byline).toHaveTextContent('Real name');
    expect(byline).toHaveTextContent('The patient');
    expect(byline).toHaveTextContent('1 June 2026');
    expect(screen.getByText(/Treatment period: March 2026/)).toBeInTheDocument();
  });

  it('never names an anonymous author, not even by their alias', () => {
    const review = buildReviewCard({ identityMode: 'anonymous', authorDisplayName: 'quiet_alias' });
    renderInLocale('en', <ExperienceRow review={review} />);

    expect(screen.getByText('Written anonymously')).toBeInTheDocument();
    expect(screen.queryByText(/quiet_alias/)).toBeNull();
  });

  it('words ready documents exactly as not medically validated, with their count', () => {
    renderInLocale('en', <ExperienceRow review={buildReviewCard({ readyEvidenceCount: 2 })} />);

    expect(screen.getByText('Documents attached — not medically validated')).toBeInTheDocument();
    expect(screen.getByText('2 documents')).toBeInTheDocument();
    expect(screen.queryByText('No documents')).toBeNull();
  });

  it('says "No documents" when no file is ready', () => {
    renderInLocale('en', <ExperienceRow review={buildReviewCard({ readyEvidenceCount: 0 })} />);

    expect(screen.getByText('No documents')).toBeInTheDocument();
    expect(screen.queryByText(/not medically validated/)).toBeNull();
  });

  it('marks an edited experience and leaves out a missing sentiment and outcome', () => {
    const review = buildReviewCard({ edited: true, sentiment: null, outcome: null });
    renderInLocale('en', <ExperienceRow review={review} />);

    expect(screen.getByText('Edited')).toBeInTheDocument();
    expect(document.querySelector('.badge.positive')).toBeNull();
    expect(screen.queryByText('Helped')).toBeNull();
  });

  it('leaves the doctor link out on the doctor’s own page', () => {
    const review = buildReviewCard();
    renderInLocale('en', <ExperienceRow review={review} showDoctor={false} />);

    expect(screen.queryByRole('link', { name: review.doctor.name })).toBeNull();
  });

  it('renders in Bengali with Bengali numerals', () => {
    const base = buildReviewCard();
    const review = buildReviewCard({
      title: 'যত্ন ভালো ছিল',
      doctor: { ...base.doctor, name: 'ডা. পরীক্ষা' },
      commentCount: 12,
      readyEvidenceCount: 3,
    });
    renderInLocale('bn', <ExperienceRow review={review} />);

    expect(screen.getByText('১২টি মন্তব্য')).toBeInTheDocument();
    expect(screen.getByText('৩টি কাগজপত্র')).toBeInTheDocument();
    expect(screen.getByText(/মার্চ ২০২৬/)).toBeInTheDocument();
    expect(document.querySelector('.byline-when')).toHaveTextContent('১ জুন ২০২৬');
    expect(document.body.textContent).not.toMatch(/[0-9]/);
  });
});

describe('initialsFor', () => {
  it('takes the first and last initials of a real name without the doctor title', () => {
    expect(initialsFor('Dr. Rina Akter', 'real')).toBe('RA');
  });

  it('marks a username with "@" and its first letter', () => {
    expect(initialsFor('shirin_88', 'pseudo')).toBe('@s');
  });

  it('keeps a whole Bengali letter rather than half of one', () => {
    expect(initialsFor('রিনা', 'real')).toBe('র');
  });
});
