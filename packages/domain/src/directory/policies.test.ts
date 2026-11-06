import { describe, expect, it } from 'vitest';

import { branchNames, omitEmptyFields, registrationNotVerified } from './policies';

describe('registrationNotVerified', () => {
  it('is true whatever is stored, a BMDC number included', () => {
    expect(registrationNotVerified()).toBe(true);
  });
});

describe('omitEmptyFields', () => {
  const now = '2026-11-01T00:00:00.000Z';

  it('drops null, blank and hidden facts and keeps the given order', () => {
    const shown = omitEmptyFields(
      [
        { key: 'bmdc', value: 'A-1', provenanceFields: ['bmdc_number'] },
        { key: 'specialty', value: null, provenanceFields: ['specialty_id'] },
        { key: 'qualifications', value: '   ', provenanceFields: ['qualifications_en'] },
        { key: 'languages', value: 'Bangla', provenanceFields: ['languages_en'] },
        { key: 'fee', value: '৳800', provenanceFields: ['fee_display_en'] },
      ],
      {
        bmdc_number: { source: 'admin', updatedAt: now },
        fee_display_en: { source: 'provider', updatedAt: now, hidden: true },
      },
    );
    expect(shown.map((f) => f.key)).toEqual(['bmdc', 'languages']);
    expect(shown[0]?.provenanceField).toBe('bmdc_number');
    expect(shown[1]?.provenanceField).toBeUndefined();
  });

  it('returns nothing for an empty list', () => {
    expect(omitEmptyFields([], {})).toEqual([]);
  });
});

describe('branchNames', () => {
  it('titles a branch by its own name and shows its label and organisation', () => {
    expect(
      branchNames({
        ownName: 'Shefa General Hospital',
        name: 'Dhanmondi branch',
        facilityName: 'Shefa Health Group',
      }),
    ).toEqual({
      title: 'Shefa General Hospital',
      branchName: 'Dhanmondi branch',
      parentName: 'Shefa Health Group',
    });
  });

  it('gives a single-branch organisation one name', () => {
    expect(
      branchNames({
        ownName: null,
        name: 'Bandar Diagnostic Centre',
        facilityName: 'Bandar Diagnostic Centre',
      }),
    ).toEqual({ title: 'Bandar Diagnostic Centre' });
  });

  it('titles a labelled branch without its own name by its organisation', () => {
    expect(
      branchNames({
        ownName: undefined,
        name: 'Dhanmondi branch',
        facilityName: 'Shefa Health Group',
      }),
    ).toEqual({ title: 'Shefa Health Group', branchName: 'Dhanmondi branch' });
  });
});
