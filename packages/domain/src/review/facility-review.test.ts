import { describe, expect, it } from 'vitest';

import { completeCriteria, criteriaValid, facilityMinimumFieldsMissing } from './facility-review';

// The nine criteria and three values of `contracts` CRITERIA and CRITERION_VALUES.
const CRITERIA = [
  'staff',
  'waiting',
  'cleanliness',
  'billing',
  'reportTime',
  'reportTrust',
  'admission',
  'recommend',
  'overall',
] as const;
const VALUES = ['good', 'mixed', 'poor'] as const;
const TODAY = { year: 2026, month: 11 };

describe('criteriaValid', () => {
  it('accepts no criteria and empty criteria, since every criterion is optional', () => {
    expect(criteriaValid(undefined, CRITERIA, VALUES)).toBe(true);
    expect(criteriaValid({}, CRITERIA, VALUES)).toBe(true);
  });

  it('accepts known criteria with good, mixed, poor or no answer', () => {
    expect(
      criteriaValid(
        { staff: 'good', waiting: 'mixed', billing: 'poor', overall: null },
        CRITERIA,
        VALUES,
      ),
    ).toBe(true);
  });

  it('refuses an unknown criterion', () => {
    expect(criteriaValid({ parking: 'good' }, CRITERIA, VALUES)).toBe(false);
  });

  it('refuses a value outside good, mixed and poor, a number among them', () => {
    expect(criteriaValid({ staff: 'excellent' }, CRITERIA, VALUES)).toBe(false);
    expect(criteriaValid({ overall: 5 }, CRITERIA, VALUES)).toBe(false);
  });
});

describe('completeCriteria', () => {
  it('stores every criterion, an unanswered one as null', () => {
    const stored = completeCriteria({ staff: 'good' }, CRITERIA);
    expect(Object.keys(stored)).toEqual([...CRITERIA]);
    expect(stored.staff).toBe('good');
    expect(stored.overall).toBeNull();
  });
});

describe('facilityMinimumFieldsMissing', () => {
  const story = 'The ward was clean and the staff kind.';

  it('is empty when branch, period and story are present', () => {
    expect(
      facilityMinimumFieldsMissing({
        branchVisible: true,
        period: { year: 2026, month: 1 },
        today: TODAY,
        story,
      }),
    ).toEqual([]);
  });

  it('reports branch, period and story in that order', () => {
    expect(
      facilityMinimumFieldsMissing({
        branchVisible: false,
        period: null,
        today: TODAY,
        story: 'Short',
      }),
    ).toEqual(['branch', 'period', 'story']);
  });
});
