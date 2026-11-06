import { describe, expect, it } from 'vitest';

import {
  AddMemberDoctorInput,
  BranchCriteriaInput,
  DoctorDistributionInput,
  GetDoctorInput,
  ListDoctorsInput,
  ListExperienceCardsInput,
} from './directory';

const PUBLIC_ID = 'a1b2c3d4e5';
const UUID = '0190a0b0-0000-7000-8000-000000000001';

describe('GetDoctorInput', () => {
  it('accepts a public id with every typed filter', () => {
    const parsed = GetDoctorInput.safeParse({
      publicId: PUBLIC_ID,
      condition: PUBLIC_ID,
      outcome: 'helped',
      relationship: 'parent',
      docs: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses an outcome outside the enum and a malformed id', () => {
    expect(GetDoctorInput.safeParse({ publicId: PUBLIC_ID, outcome: 'great' }).success).toBe(false);
    expect(GetDoctorInput.safeParse({ publicId: 'NOT-AN-ID' }).success).toBe(false);
  });
});

describe('ListDoctorsInput', () => {
  it('accepts a page of up to 100 and refuses an untyped filter', () => {
    expect(ListDoctorsInput.safeParse({ page: 1, pageSize: 100 }).success).toBe(true);
    expect(ListDoctorsInput.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(ListDoctorsInput.safeParse({ filters: { city: 'Dhaka' } }).success).toBe(false);
  });
});

describe('AddMemberDoctorInput', () => {
  it('accepts a typed name with an optional specialty, place and BMDC number', () => {
    const parsed = AddMemberDoctorInput.safeParse({
      name: '  Dr. Synthetic Rahman ',
      specialtyId: UUID,
      practiceArea: 'Synthetic Clinic, Mirpur',
      bmdcNumber: 'A-12345',
    });
    expect(parsed.success && parsed.data.name).toBe('Dr. Synthetic Rahman');
  });

  it('refuses a name over 120 characters, a place over 200 and a BMDC number with spaces', () => {
    expect(AddMemberDoctorInput.safeParse({ name: 'a'.repeat(121) }).success).toBe(false);
    expect(
      AddMemberDoctorInput.safeParse({ name: 'Dr. Synthetic', practiceArea: 'p'.repeat(201) })
        .success,
    ).toBe(false);
    expect(
      AddMemberDoctorInput.safeParse({ name: 'Dr. Synthetic', bmdcNumber: 'A 123' }).success,
    ).toBe(false);
  });
});

describe('the review read inputs', () => {
  it('take an internal doctor or branch id and refuse an unknown criterion', () => {
    expect(DoctorDistributionInput.safeParse({ doctorId: UUID }).success).toBe(true);
    expect(BranchCriteriaInput.safeParse({ branchId: UUID, key: 'overall' }).success).toBe(true);
    expect(BranchCriteriaInput.safeParse({ branchId: UUID, key: 'stars' }).success).toBe(false);
  });

  it('bounds the experience card page at 50', () => {
    expect(ListExperienceCardsInput.safeParse({ limit: 50 }).success).toBe(true);
    expect(ListExperienceCardsInput.safeParse({ limit: 51 }).success).toBe(false);
  });
});
