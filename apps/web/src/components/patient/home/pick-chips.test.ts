import { describe, expect, it } from 'vitest';
import type { ConditionCardVM } from '@rogikotha/contracts';
import { browseConditions, pickChips } from './pick-chips';

let seq = 0;
function aCondition(overrides: Partial<ConditionCardVM> = {}): ConditionCardVM {
  seq += 1;
  return {
    publicId: `c${String(seq).padStart(9, '0')}`,
    name: `Synthetic topic ${seq}`,
    accountsTotal: 1,
    ...overrides,
  };
}

const names = (list: ConditionCardVM[]) => list.map((c) => c.name);

describe('pickChips', () => {
  it('leaves out topics with no accounts', () => {
    const chips = pickChips(
      [aCondition({ name: 'Asthma', accountsTotal: 0 }), aCondition({ name: 'Migraine' })],
      'en',
    );
    expect(names(chips)).toEqual(['Migraine']);
  });

  it('puts the topic with the most accounts first', () => {
    const chips = pickChips(
      [
        aCondition({ name: 'Asthma', accountsTotal: 2 }),
        aCondition({ name: 'Migraine', accountsTotal: 7 }),
        aCondition({ name: 'Dengue', accountsTotal: 4 }),
      ],
      'en',
    );
    expect(names(chips)).toEqual(['Migraine', 'Dengue', 'Asthma']);
  });

  it('breaks a tie by name in English', () => {
    const chips = pickChips(
      [
        aCondition({ name: 'Typhoid', accountsTotal: 3 }),
        aCondition({ name: 'asthma', accountsTotal: 3 }),
        aCondition({ name: 'Dengue', accountsTotal: 3 }),
      ],
      'en',
    );
    expect(names(chips)).toEqual(['asthma', 'Dengue', 'Typhoid']);
  });

  it('breaks a tie by name in Bengali', () => {
    const chips = pickChips(
      [
        aCondition({ name: 'হাঁপানি', accountsTotal: 3 }),
        aCondition({ name: 'ডেঙ্গু', accountsTotal: 3 }),
        aCondition({ name: 'আমাশয়', accountsTotal: 3 }),
      ],
      'bn',
    );
    expect(names(chips)).toEqual(['আমাশয়', 'ডেঙ্গু', 'হাঁপানি']);
  });

  it('shows at most five topics', () => {
    const many = Array.from({ length: 8 }, (_, i) => aCondition({ accountsTotal: 10 - i }));
    const chips = pickChips(many, 'en');
    expect(chips).toHaveLength(5);
    expect(chips.map((c) => c.accountsTotal)).toEqual([10, 9, 8, 7, 6]);
  });

  it('returns no chips for an empty list', () => {
    expect(pickChips([], 'bn')).toEqual([]);
  });

  it('does not reorder the list it was given', () => {
    const input = [aCondition({ accountsTotal: 1 }), aCondition({ accountsTotal: 9 })];
    const before = names(input);
    pickChips(input, 'en');
    expect(names(input)).toEqual(before);
  });
});

describe('browseConditions', () => {
  it('keeps the query order and drops topics with no accounts', () => {
    const list = browseConditions([
      aCondition({ name: 'Typhoid', accountsTotal: 1 }),
      aCondition({ name: 'Asthma', accountsTotal: 0 }),
      aCondition({ name: 'Dengue', accountsTotal: 9 }),
    ]);
    expect(names(list)).toEqual(['Typhoid', 'Dengue']);
  });

  it('returns an empty list when no topic has accounts', () => {
    expect(browseConditions([aCondition({ accountsTotal: 0 })])).toEqual([]);
  });
});
