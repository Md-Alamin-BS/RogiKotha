import { describe, expect, it } from 'vitest';

import {
  type MinimumFieldsInput,
  REVIEW_TAG_MAX,
  type ReviewTagInput,
  dedupeTags,
  deriveTitle,
  detectLanguage,
  dhakaCalendarDate,
  exactDateValid,
  graphemeLength,
  minimumFieldsMissing,
  orderedSections,
  periodValid,
  tagRuleOutcome,
  tagRuleSatisfied,
} from './review';

const TODAY = { year: 2026, month: 11, day: 6 };
const STORY = 'The doctor listened carefully and explained the plan.';

function aMinimum(overrides: Partial<MinimumFieldsInput> = {}): MinimumFieldsInput {
  return {
    doctor: { kind: 'listed', visible: true },
    relationship: 'self',
    period: { year: 2026, month: 3 },
    today: TODAY,
    mode: 'quick',
    story: STORY,
    tags: [{ group: 'condition', termPublicId: 'c0000000a1' }],
    notSure: false,
    ...overrides,
  };
}

function typedTags(count: number): ReviewTagInput[] {
  return Array.from({ length: count }, (_, i) => ({ group: 'medicine', text: `tag ${i}` }));
}

describe('graphemeLength', () => {
  it('counts a Bengali conjunct with its vowel sign as one grapheme each', () => {
    expect(graphemeLength('ক্ষি')).toBe(1);
    expect(graphemeLength('ডাক্তার')).toBe(3);
  });

  it('counts an emoji with a skin tone as one grapheme', () => {
    expect(graphemeLength('ok 👍🏽')).toBe(4);
  });
});

describe('minimumFieldsMissing', () => {
  it('is empty when every minimum item is present', () => {
    expect(minimumFieldsMissing(aMinimum())).toEqual([]);
  });

  it('reports every missing item together, in the order doctor, relationship, period, story, tags', () => {
    expect(
      minimumFieldsMissing(
        aMinimum({
          doctor: { kind: 'none' },
          relationship: null,
          period: null,
          story: '',
          tags: [],
        }),
      ),
    ).toEqual(['doctor', 'relationship', 'period', 'story', 'tags']);
  });

  it('refuses a listed doctor that is not visible', () => {
    expect(minimumFieldsMissing(aMinimum({ doctor: { kind: 'listed', visible: false } }))).toEqual([
      'doctor',
    ]);
  });

  it('accepts a new doctor with three letters after the title and refuses one with two', () => {
    expect(minimumFieldsMissing(aMinimum({ doctor: { kind: 'new', nameLetterCount: 3 } }))).toEqual(
      [],
    );
    expect(minimumFieldsMissing(aMinimum({ doctor: { kind: 'new', nameLetterCount: 2 } }))).toEqual(
      ['doctor'],
    );
  });

  it('reports a blank relationship', () => {
    expect(minimumFieldsMissing(aMinimum({ relationship: '  ' }))).toEqual(['relationship']);
  });

  it('reports a period after the current month', () => {
    expect(minimumFieldsMissing(aMinimum({ period: { year: 2026, month: 12 } }))).toEqual([
      'period',
    ]);
  });

  it('refuses a quick story under 20 graphemes after trimming and accepts exactly 20', () => {
    expect(minimumFieldsMissing(aMinimum({ story: `   ${'a'.repeat(19)}   ` }))).toEqual(['story']);
    expect(minimumFieldsMissing(aMinimum({ story: 'a'.repeat(20) }))).toEqual([]);
  });

  it('counts a Bengali quick story in graphemes, not code units', () => {
    const nineteen = 'ক্ষি'.repeat(19);
    expect(nineteen.length).toBeGreaterThan(20);
    expect(minimumFieldsMissing(aMinimum({ story: nineteen }))).toEqual(['story']);
  });

  it('refuses a quick story over 10 000 graphemes', () => {
    expect(minimumFieldsMissing(aMinimum({ story: 'a'.repeat(10_001) }))).toEqual(['story']);
  });

  it('accepts a detailed story whose sections together reach 20 graphemes', () => {
    expect(
      minimumFieldsMissing(
        aMinimum({
          mode: 'detailed',
          story: null,
          sections: { symptoms: 'Fever for days', treatment: 'Rest, fluids' },
        }),
      ),
    ).toEqual([]);
  });

  it('refuses a detailed story with no filled section or under 20 graphemes in total', () => {
    expect(
      minimumFieldsMissing(aMinimum({ mode: 'detailed', story: STORY, sections: { after: ' ' } })),
    ).toEqual(['story']);
    expect(
      minimumFieldsMissing(aMinimum({ mode: 'detailed', sections: { symptoms: 'Fever' } })),
    ).toEqual(['story']);
  });

  it('reports the tags when only a treatment chip is chosen', () => {
    expect(
      minimumFieldsMissing(
        aMinimum({ tags: [{ group: 'treatment', termPublicId: 't0000000a1' }] }),
      ),
    ).toEqual(['tags']);
  });

  it('does not report too many tags as a missing item', () => {
    expect(minimumFieldsMissing(aMinimum({ tags: typedTags(REVIEW_TAG_MAX + 1) }))).toEqual([]);
  });
});

describe('the tag rule', () => {
  it('is missing with no tag and no Not sure', () => {
    expect(tagRuleOutcome([], false)).toBe('missing');
    expect(tagRuleSatisfied([], false)).toBe(false);
  });

  it('is satisfied by Not sure alone', () => {
    expect(tagRuleOutcome([], true)).toBe('ok');
  });

  it('is satisfied by a condition or symptom chip, or by a typed tag of any group', () => {
    expect(tagRuleSatisfied([{ group: 'symptom', termPublicId: 's0000000a1' }], false)).toBe(true);
    expect(tagRuleSatisfied([{ group: 'medicine', text: 'Paracetamol' }], false)).toBe(true);
    expect(tagRuleSatisfied([{ group: 'medicine', termPublicId: 'm0000000a1' }], false)).toBe(
      false,
    );
  });

  it('accepts 20 tags and refuses 21', () => {
    expect(tagRuleOutcome(typedTags(20), false)).toBe('ok');
    expect(tagRuleOutcome(typedTags(21), false)).toBe('too_many');
  });

  it('counts the Not sure row toward the 20', () => {
    expect(tagRuleOutcome(typedTags(19), true)).toBe('ok');
    expect(tagRuleOutcome(typedTags(20), true)).toBe('too_many');
  });

  it('drops repeated chips and case-folded repeated text before counting', () => {
    const tags: ReviewTagInput[] = [
      { group: 'condition', termPublicId: 'c0000000a1' },
      { group: 'condition', termPublicId: 'c0000000a1' },
      { group: 'medicine', text: 'Napa' },
      { group: 'medicine', text: ' napa ' },
      { group: 'treatment', text: 'Napa' },
    ];
    expect(dedupeTags(tags)).toEqual([tags[0], tags[2], tags[4]]);
    expect(tagRuleOutcome([...typedTags(20), ...typedTags(20)], false)).toBe('ok');
  });
});

describe('periodValid', () => {
  it('accepts January 2000 and the current month', () => {
    expect(periodValid({ year: 2000, month: 1 }, TODAY)).toBe(true);
    expect(periodValid({ year: 2026, month: 11 }, TODAY)).toBe(true);
  });

  it('refuses a month before 2000, a future month, a missing period and an impossible month', () => {
    expect(periodValid({ year: 1999, month: 12 }, TODAY)).toBe(false);
    expect(periodValid({ year: 2026, month: 12 }, TODAY)).toBe(false);
    expect(periodValid(null, TODAY)).toBe(false);
    expect(periodValid({ year: 2026, month: 13 }, TODAY)).toBe(false);
    expect(periodValid({ year: 2025.5, month: 1 }, TODAY)).toBe(false);
  });
});

describe('exactDateValid', () => {
  const period = { year: 2026, month: 11 };

  it('accepts no exact date and a real date inside the month up to today', () => {
    expect(exactDateValid(undefined, period, TODAY)).toBe(true);
    expect(exactDateValid('2026-11-01', period, TODAY)).toBe(true);
    expect(exactDateValid('2026-11-06', period, TODAY)).toBe(true);
  });

  it('refuses a date after today', () => {
    expect(exactDateValid('2026-11-07', period, TODAY)).toBe(false);
  });

  it('refuses a date outside the period month, before or after it', () => {
    expect(exactDateValid('2026-10-31', period, TODAY)).toBe(false);
    expect(exactDateValid('2026-03-15', { year: 2026, month: 4 }, TODAY)).toBe(false);
  });

  it('refuses a date that does not exist and a malformed one', () => {
    expect(exactDateValid('2025-02-29', { year: 2025, month: 2 }, TODAY)).toBe(false);
    expect(exactDateValid('2024-02-29', { year: 2024, month: 2 }, TODAY)).toBe(true);
    expect(exactDateValid('2026-11-6', period, TODAY)).toBe(false);
  });
});

describe('dhakaCalendarDate', () => {
  it('turns to the next day at 18:00 UTC', () => {
    expect(dhakaCalendarDate(new Date('2026-11-30T17:59:59Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 30,
    });
    expect(dhakaCalendarDate(new Date('2026-11-30T18:00:00Z'))).toEqual({
      year: 2026,
      month: 12,
      day: 1,
    });
  });
});

describe('deriveTitle', () => {
  it("keeps the author's trimmed title", () => {
    expect(deriveTitle({ title: '  Careful and kind  ', mode: 'quick', story: STORY })).toBe(
      'Careful and kind',
    );
  });

  it('uses the first sentence of the story when there is no title', () => {
    expect(deriveTitle({ mode: 'quick', story: 'He listened. Then he explained.' })).toBe(
      'He listened.',
    );
  });

  it('ends the first sentence at a Bengali danda or a line break', () => {
    expect(deriveTitle({ mode: 'quick', story: 'ডাক্তার মন দিয়ে শুনলেন। তারপর বোঝালেন।' })).toBe(
      'ডাক্তার মন দিয়ে শুনলেন।',
    );
    expect(deriveTitle({ mode: 'quick', story: 'First line\nSecond line' })).toBe('First line');
  });

  it('does not end a sentence inside a decimal number', () => {
    expect(deriveTitle({ mode: 'quick', story: 'Took 2.5 mg daily. It helped.' })).toBe(
      'Took 2.5 mg daily.',
    );
  });

  it('uses the first filled section of a detailed story', () => {
    expect(
      deriveTitle({
        mode: 'detailed',
        sections: { after: 'Better now.', diagnosis: 'Typhoid, confirmed.' },
      }),
    ).toBe('Typhoid, confirmed.');
  });

  it('derives the title when the given title is longer than 120 graphemes', () => {
    expect(deriveTitle({ title: 'x'.repeat(121), mode: 'quick', story: 'Short.' })).toBe('Short.');
  });

  it('cuts a long first sentence at 80 Bengali graphemes with an ellipsis', () => {
    const title = deriveTitle({ mode: 'quick', story: 'ক্ষি'.repeat(100) });
    expect(title).not.toBeNull();
    expect(title?.endsWith('…')).toBe(true);
    expect(graphemeLength(title ?? '')).toBe(81);
    expect(title).toBe(`${'ক্ষি'.repeat(80)}…`);
  });

  it('is null when there is no text at all', () => {
    expect(deriveTitle({ title: ' ', mode: 'quick', story: '' })).toBeNull();
  });
});

describe('detectLanguage', () => {
  it('is bn for Bengali letters only', () => {
    expect(detectLanguage(['ভালো অভিজ্ঞতা', 'ডাক্তার ভালো ছিলেন ২০২৬'], 'en')).toBe('bn');
  });

  it('is en for Latin letters only', () => {
    expect(detectLanguage(['Good care', 'Seen in 2026.'], 'bn')).toBe('en');
  });

  it('is mixed when both scripts appear', () => {
    expect(detectLanguage(['Good care', 'ডাক্তার ভালো'], 'en')).toBe('mixed');
  });

  it("falls back to the actor's locale when there are no letters", () => {
    expect(detectLanguage(['2026 — 999', null, undefined], 'bn')).toBe('bn');
  });
});

describe('orderedSections', () => {
  it('orders the sections symptoms, diagnosis, treatment, after and leaves out empty ones', () => {
    expect(
      orderedSections({ after: 'Better', symptoms: 'Fever', treatment: '  ', diagnosis: null }),
    ).toEqual([
      { key: 'symptoms', body: 'Fever' },
      { key: 'after', body: 'Better' },
    ]);
  });

  it('keeps each body exactly as written', () => {
    expect(orderedSections({ diagnosis: 'Line one\n\tLine two' })).toEqual([
      { key: 'diagnosis', body: 'Line one\n\tLine two' },
    ]);
  });

  it('is empty for no sections', () => {
    expect(orderedSections(undefined)).toEqual([]);
  });
});
