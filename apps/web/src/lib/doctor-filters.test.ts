import { describe, expect, it } from 'vitest';

import { filterHref, parseProfileFilters } from './doctor-filters';

const ID = 'abcdefgh23';
const CONDITION = 'k2m3n4p5q6';

describe('parseProfileFilters', () => {
  it('reads every valid filter', () => {
    expect(
      parseProfileFilters({
        condition: CONDITION,
        outcome: 'helped',
        relationship: 'parent',
        docs: '1',
      }),
    ).toEqual({ condition: CONDITION, outcome: 'helped', relationship: 'parent', docs: true });
  });

  it('drops an invalid value instead of failing (BR9.3)', () => {
    expect(
      parseProfileFilters({
        condition: 'not a public id',
        outcome: 'cured',
        relationship: 'friend',
        docs: 'yes',
      }),
    ).toEqual({});
  });

  it('takes the first of a repeated parameter and accepts no search at all', () => {
    expect(parseProfileFilters({ outcome: ['worse', 'helped'] })).toEqual({ outcome: 'worse' });
    expect(parseProfileFilters(undefined)).toEqual({});
  });
});

describe('filterHref', () => {
  it('builds the profile path with the set filters in a fixed order', () => {
    expect(filterHref(ID, { docs: true, relationship: 'self', condition: CONDITION })).toBe(
      `/doctors/${ID}?condition=${CONDITION}&relationship=self&docs=1`,
    );
  });

  it('gives the bare profile path when no filter is set', () => {
    expect(filterHref(ID, {})).toBe(`/doctors/${ID}`);
    expect(filterHref(ID, { docs: false })).toBe(`/doctors/${ID}`);
  });

  it('round-trips through parseProfileFilters', () => {
    const filters = { condition: CONDITION, outcome: 'none' as const, docs: true };
    const query = new URLSearchParams(filterHref(ID, filters).split('?')[1]);

    expect(parseProfileFilters(Object.fromEntries(query))).toEqual(filters);
  });
});
