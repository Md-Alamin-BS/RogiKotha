import { describe, expect, expectTypeOf, it } from 'vitest';

import { CRITERIA, CRITERION_VALUES } from '../enums';
import { ERROR_CODES, errorMessageKey } from '../errors';
import type { ExperiencePageVM, PageBylineVM } from '../view-models/experience';
import {
  CORRECTION_FIELDS,
  CorrectReviewInput,
  DiscardDraftInput,
  DraftPayload,
  FacilityReviewPublishInput,
  PublishReviewInput,
  REVIEWER_LABEL_CODES,
  SaveDraftInput,
} from './review';

const DRAFT_ID = '01920000-0000-7000-8000-000000000001';
const DOCTOR = 'd0c0000001';

/** Every field set, so a walk over the parsed value sees every leaf. */
const FULL_DRAFT = {
  v: 1,
  target: 'doctor',
  mode: 'detailed',
  step: 3,
  doctorPublicId: DOCTOR,
  relationship: 'parent',
  period: { year: 2026, month: 3 },
  exactDate: '2026-03-14',
  title: 'Careful with my mother',
  story: 'A synthetic story long enough to count.',
  sections: { symptoms: 'Fever', diagnosis: 'Typhoid', treatment: 'Rest', after: 'Better' },
  tags: [
    { group: 'condition', termPublicId: 'c0000000a1' },
    { group: 'medicine', text: 'Napa' },
  ],
  notSure: true,
  sentiment: 'positive',
  outcome: 'helped',
  claims: ['wrongDx', 'secondOpinion'],
  criteria: { staff: 'good', overall: 'mixed' },
  identityMode: 'named',
  dismissedChecks: ['pii'],
};

function numericLeafPaths(value: unknown, path = ''): string[] {
  if (typeof value === 'number') return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => numericLeafPaths(v, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      numericLeafPaths(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

describe('DraftPayload', () => {
  it('parses an empty payload leniently, with the defaults', () => {
    expect(DraftPayload.parse({})).toEqual({
      v: 1,
      target: 'doctor',
      mode: 'quick',
      step: 1,
      tags: [],
      notSure: false,
      claims: [],
      identityMode: 'pseudonymous',
    });
  });

  it('drops unknown keys such as the FR46 checkboxes and a rating', () => {
    const parsed = DraftPayload.parse({ wentWell: ['listened'], rating: 5, stars: 4 });
    expect(parsed).not.toHaveProperty('wentWell');
    expect(parsed).not.toHaveProperty('rating');
    expect(parsed).not.toHaveProperty('stars');
  });

  it('trims outer whitespace and keeps line breaks and tabs inside a story', () => {
    const parsed = DraftPayload.parse({ story: '  Line one\n\tLine two  ' });
    expect(parsed.story).toBe('Line one\n\tLine two');
  });

  it('refuses a zero-width or bidi character in the text', () => {
    expect(DraftPayload.safeParse({ story: 'Fine\u200Btext' }).success).toBe(false);
    expect(DraftPayload.safeParse({ title: 'Dr\u202EX' }).success).toBe(false);
    expect(DraftPayload.safeParse({ title: 'Two\nlines' }).success).toBe(false);
  });

  it('counts the story limit in graphemes, so 10 000 Bengali graphemes save', () => {
    const bengali = 'ক্ষি'.repeat(10_000);
    expect(bengali.length).toBeGreaterThan(10_000);
    expect(DraftPayload.safeParse({ story: bengali }).success).toBe(true);
    expect(DraftPayload.safeParse({ story: `${bengali}ক` }).success).toBe(false);
  });

  it('enforces the bounds: 20 tags, the step, the month and a typed tag of 1 to 60 graphemes', () => {
    const tags = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ group: 'symptom', text: `t${i}` }));
    expect(DraftPayload.safeParse({ tags: tags(20) }).success).toBe(true);
    expect(DraftPayload.safeParse({ tags: tags(21) }).success).toBe(false);
    expect(DraftPayload.safeParse({ step: 5 }).success).toBe(false);
    expect(DraftPayload.safeParse({ period: { year: 2026, month: 13 } }).success).toBe(false);
    expect(DraftPayload.safeParse({ tags: [{ group: 'symptom', text: '  ' }] }).success).toBe(
      false,
    );
    expect(
      DraftPayload.safeParse({ tags: [{ group: 'symptom', text: 'x'.repeat(61) }] }).success,
    ).toBe(false);
  });

  it('refuses a value outside its list', () => {
    expect(DraftPayload.safeParse({ sentiment: 'great' }).success).toBe(false);
    expect(DraftPayload.safeParse({ claims: ['misconduct'] }).success).toBe(false);
    expect(DraftPayload.safeParse({ criteria: { staff: 'excellent' } }).success).toBe(false);
    expect(DraftPayload.safeParse({ criteria: { parking: 'good' } }).success).toBe(false);
  });

  it('keeps each Reviewer label once', () => {
    expect(DraftPayload.parse({ claims: ['wrongRx', 'wrongRx'] }).claims).toEqual(['wrongRx']);
  });

  it('saves a half-typed new doctor but refuses one named together with a listed doctor', () => {
    expect(DraftPayload.safeParse({ newDoctor: { name: 'Dr. R' } }).success).toBe(true);
    const both = DraftPayload.safeParse({
      doctorPublicId: DOCTOR,
      newDoctor: { name: 'Dr. Rahim' },
    });
    expect(both.success).toBe(false);
    expect(both.error?.issues[0]?.path).toEqual(['newDoctor']);
  });

  it('refuses a malformed BMDC number', () => {
    expect(DraftPayload.safeParse({ newDoctor: { name: 'Rahim', bmdc: 'A-123' } }).success).toBe(
      true,
    );
    expect(DraftPayload.safeParse({ newDoctor: { name: 'Rahim', bmdc: 'A 123' } }).success).toBe(
      false,
    );
  });

  it('parses a payload with every field set', () => {
    expect(DraftPayload.safeParse(FULL_DRAFT).success).toBe(true);
  });
});

describe('SaveDraftInput and DiscardDraftInput', () => {
  it('accepts a new draft without an id and an existing draft by its uuid', () => {
    expect(SaveDraftInput.safeParse({ payload: {} }).success).toBe(true);
    expect(SaveDraftInput.safeParse({ draftId: DRAFT_ID, payload: {} }).success).toBe(true);
  });

  it('refuses a draft id that is not a uuid', () => {
    expect(SaveDraftInput.safeParse({ draftId: 'draft-1', payload: {} }).success).toBe(false);
    expect(DiscardDraftInput.safeParse({ draftId: 'draft-1' }).success).toBe(false);
    expect(DiscardDraftInput.safeParse({ draftId: DRAFT_ID }).success).toBe(true);
  });
});

describe('PublishReviewInput', () => {
  it('requires the attestation to be the literal true', () => {
    const base = { draftId: DRAFT_ID, identityMode: 'anonymous' };
    expect(PublishReviewInput.safeParse({ ...base, attestation: true }).success).toBe(true);
    expect(PublishReviewInput.safeParse({ ...base, attestation: false }).success).toBe(false);
    expect(PublishReviewInput.safeParse(base).success).toBe(false);
  });
});

describe("Reviewer's label codes", () => {
  it("are the prototype's three codes (FD-111)", () => {
    expect(REVIEWER_LABEL_CODES).toEqual(['wrongDx', 'wrongRx', 'secondOpinion']);
  });
});

describe('the anonymous new doctor error code', () => {
  it('exists and maps to errors.review.anonymousNewDoctor (BR3.12)', () => {
    expect(ERROR_CODES).toContain('review.anonymous_new_doctor');
    expect(errorMessageKey('review.anonymous_new_doctor')).toBe('errors.review.anonymousNewDoctor');
  });
});

type NumericKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends number ? K : never;
}[keyof T];

describe('no score anywhere (BR9.4)', () => {
  it('a draft carries numbers only for its version, its step and the treatment month', () => {
    expect(numericLeafPaths(DraftPayload.parse(FULL_DRAFT)).sort()).toEqual(
      ['period.month', 'period.year', 'step', 'v'].sort(),
    );
  });

  it('the experience page and its byline have no numeric field besides the period', () => {
    expectTypeOf<NumericKeys<ExperiencePageVM>>().toEqualTypeOf<never>();
    expectTypeOf<NumericKeys<ExperiencePageVM['doctor']>>().toEqualTypeOf<never>();
    expectTypeOf<NumericKeys<PageBylineVM>>().toEqualTypeOf<never>();
    expectTypeOf<NumericKeys<ExperiencePageVM['period']>>().toEqualTypeOf<'year' | 'month'>();
    expectTypeOf<
      Extract<keyof ExperiencePageVM, 'score' | 'rating' | 'likes' | 'dislikes' | 'commentsCount'>
    >().toEqualTypeOf<never>();
  });

  it('facility criteria take only good, mixed or poor, never a number', () => {
    expect(CRITERION_VALUES).toEqual(['good', 'mixed', 'poor']);
    expect(DraftPayload.safeParse({ criteria: { overall: 5 } }).success).toBe(false);
    const criteria = Object.fromEntries(CRITERIA.map((key) => [key, 3]));
    expect(
      FacilityReviewPublishInput.safeParse({
        draftId: DRAFT_ID,
        identityMode: 'named',
        attestation: true,
        criteria,
      }).success,
    ).toBe(false);
  });
});

describe('CorrectReviewInput', () => {
  const quick = {
    publicId: 'r3v1ew0001',
    expectedVersion: 1,
    title: 'Careful with my mother',
    content: { kind: 'quick', story: 'A synthetic story that is long enough to count.' },
    claims: [],
  };
  const detailed = {
    ...quick,
    content: { kind: 'detailed', sections: { symptoms: 'Fever', after: 'Better' } },
    sentiment: 'mixed',
    outcome: 'helped',
    claims: ['wrongDx', 'A seeded label'],
  };

  it('accepts a quick and a detailed correction', () => {
    expect(CorrectReviewInput.safeParse(quick).success).toBe(true);
    expect(CorrectReviewInput.safeParse(detailed).success).toBe(true);
  });

  it.each(['doctorId', 'identityMode', 'tags', 'personaId', 'accountId'])(
    'refuses the extra key %s',
    (key) => {
      expect(CorrectReviewInput.safeParse({ ...quick, [key]: 'x' }).success).toBe(false);
    },
  );

  it('refuses a stale-looking version of zero', () => {
    expect(CorrectReviewInput.safeParse({ ...quick, expectedVersion: 0 }).success).toBe(false);
  });

  it('counts the title in graphemes, so 120 Bengali letters fit and 121 do not', () => {
    const bangla = (n: number) => 'ক'.repeat(n);
    expect(CorrectReviewInput.safeParse({ ...quick, title: bangla(120) }).success).toBe(true);
    expect(CorrectReviewInput.safeParse({ ...quick, title: bangla(121) }).success).toBe(false);
  });

  it('refuses content that mixes a story with sections', () => {
    const mixed = { kind: 'quick', story: 'A synthetic story.', sections: { symptoms: 'x' } };
    expect(CorrectReviewInput.safeParse({ ...quick, content: mixed }).success).toBe(false);
    const other = { kind: 'detailed', sections: {}, story: 'A synthetic story.' };
    expect(CorrectReviewInput.safeParse({ ...quick, content: other }).success).toBe(false);
  });

  it('refuses duplicate claims', () => {
    expect(CorrectReviewInput.safeParse({ ...quick, claims: ['wrongDx', 'wrongDx'] }).success).toBe(
      false,
    );
  });

  it('refuses a rating-like key inside the sections', () => {
    const content = { kind: 'detailed', sections: { symptoms: 'x', rating: '5' } };
    expect(CorrectReviewInput.safeParse({ ...quick, content }).success).toBe(false);
  });
});

describe('CORRECTION_FIELDS', () => {
  it('keeps the fixed order of the design and never names the title', () => {
    expect([...CORRECTION_FIELDS]).toEqual([
      'story',
      'symptoms',
      'diagnosis',
      'treatment',
      'after',
      'sentiment',
      'outcome',
      'claims',
    ]);
  });
});
