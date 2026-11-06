// Cumulative smoke (U46, BR8.2): the doctor profile carries "Registration not verified" and, for a
// member-added doctor, the member-added badge.
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import {
  aDoctorProfile,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { DoctorProfile } from '@/components/patient/doctors/DoctorProfile';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('./shared/link-test-support')).PlainLink,
}));

describe('directory smoke', () => {
  it('renders the profile with the not-verified badge and the member-added mark', () => {
    renderInLocale(
      'en',
      <DoctorProfile
        vm={aDoctorProfile({ memberAddedNotConfirmed: true })}
        filters={{}}
        threshold={5}
      />,
    );
    expect(screen.getByTestId('not-verified')).toHaveTextContent('Registration not verified');
    expect(screen.getByTestId('member-added')).toHaveTextContent(
      'Added by a member — not confirmed',
    );
  });
});
