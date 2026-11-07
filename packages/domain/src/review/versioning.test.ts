import { describe, expect, it } from 'vitest';

import {
  CORRECTION_FIELD_ORDER,
  type CorrectionContentInput,
  type CorrectionField,
  type ReviewContent,
  type VersionHistoryRow,
  classifyChange,
  normaliseContent,
  readCorrected,
  toHistory,
  toOriginalText,
  toVersionSnapshot,
  validateClaims,
  validateCorrectionContent,
} from './versioning';

const STORY = 'The doctor listened carefully and explained the plan.';

function aQuickInput(overrides: Partial<CorrectionContentInput> = {}): CorrectionContentInput {
  return {
    title: 'A careful doctor',
    content: { kind: 'quick', story: STORY },
    sentiment: 'positive',
    outcome: 'helped',
    claims: [],
    ...overrides,
  };
}

function aDetailedInput(
  sections: Record<string, string | undefined> = {
    symptoms: 'Fever for three days.',
    diagnosis: 'Typhoid, confirmed by a test.',
  },
): CorrectionContentInput {
  return {
    title: 'Fever care',
    content: { kind: 'detailed', sections },
    sentiment: 'mixed',
    outcome: 'uncertain',
    claims: ['wrongDx'],
  };
}

function quick(overrides: Partial<ReviewContent> = {}): ReviewContent {
  return { ...normaliseContent(aQuickInput(), 'en'), ...overrides };
}

function detailed(overrides: Partial<ReviewContent> = {}): ReviewContent {
  return { ...normaliseContent(aDetailedInput(), 'en'), ...overrides };
}

describe('normaliseContent', () => {
  it('trims the story and keeps the author title', () => {
    const content = normaliseContent(
      aQuickInput({ title: '  My title  ', content: { kind: 'quick', story: `  ${STORY}  ` } }),
      'en',
    );
    expect(content).toMatchObject({
      kind: 'quick',
      title: 'My title',
      body: STORY,
      sections: null,
    });
  });

  it('derives the title from the story when the title is left empty', () => {
    const content = normaliseContent(aQuickInput({ title: '' }), 'en');
    expect(content.title).toBe(STORY);
  });

  it('drops empty sections and derives the title from the first filled one', () => {
    const content = normaliseContent(
      {
        ...aDetailedInput({ symptoms: '   ', diagnosis: ' Typhoid. Then more. ', after: '' }),
        title: '',
      },
      'en',
    );
    expect(content.sections).toEqual({ diagnosis: 'Typhoid. Then more.' });
    expect(content.body).toBeNull();
    expect(content.title).toBe('Typhoid.');
  });

  it('recomputes the language from the new text', () => {
    const content = normaliseContent(
      aQuickInput({
        title: '',
        content: { kind: 'quick', story: 'ডাক্তার খুব যত্ন করে দেখেছেন।' },
      }),
      'en',
    );
    expect(content.language).toBe('bn');
  });

  it('keeps claims exactly as sent and absent sentiment and outcome as null', () => {
    const content = normaliseContent(
      aQuickInput({ claims: [' seeded label '], sentiment: undefined, outcome: undefined }),
      'en',
    );
    expect(content.claims).toEqual([' seeded label ']);
    expect(content.sentiment).toBeNull();
    expect(content.outcome).toBeNull();
  });
});

describe('validateCorrectionContent', () => {
  const story = (length: number) => 'a'.repeat(length);

  it.each([
    [19, false],
    [20, true],
    [10_000, true],
    [10_001, false],
  ])('a quick story of %i graphemes is valid: %s', (length, valid) => {
    const content = normaliseContent(
      aQuickInput({ content: { kind: 'quick', story: story(length) } }),
      'en',
    );
    const problems = validateCorrectionContent(content, 'quick');
    expect(problems).toEqual(valid ? [] : [{ field: 'story', reason: 'story_length' }]);
  });

  it('counts Bengali graphemes, not code units', () => {
    const content = normaliseContent(
      aQuickInput({ content: { kind: 'quick', story: 'ক্ষ'.repeat(20) } }),
      'en',
    );
    expect(validateCorrectionContent(content, 'quick')).toEqual([]);
  });

  it('refuses a detailed review with no filled section', () => {
    const content = normaliseContent(aDetailedInput({ symptoms: '  ' }), 'en');
    expect(validateCorrectionContent(content, 'detailed')).toEqual([
      { field: 'story', reason: 'story_length' },
    ]);
  });

  it('refuses a section over 5000 graphemes', () => {
    const content = normaliseContent(aDetailedInput({ treatment: story(5_001) }), 'en');
    expect(validateCorrectionContent(content, 'detailed')).toEqual([
      { field: 'story', reason: 'story_length' },
    ]);
  });

  it('accepts a section of exactly 5000 graphemes', () => {
    const content = normaliseContent(aDetailedInput({ treatment: story(5_000) }), 'en');
    expect(validateCorrectionContent(content, 'detailed')).toEqual([]);
  });

  it('refuses sections that together stay under 20 graphemes', () => {
    const content = normaliseContent(
      aDetailedInput({ symptoms: 'Fever.', diagnosis: 'Typhoid.' }),
      'en',
    );
    expect(validateCorrectionContent(content, 'detailed')).toEqual([
      { field: 'story', reason: 'story_length' },
    ]);
  });

  it('accepts sections that reach 20 graphemes together', () => {
    const content = normaliseContent(
      aDetailedInput({ symptoms: 'a'.repeat(10), after: 'b'.repeat(10) }),
      'en',
    );
    expect(validateCorrectionContent(content, 'detailed')).toEqual([]);
  });

  it('refuses a change of kind in either direction', () => {
    expect(validateCorrectionContent(quick(), 'detailed')).toEqual([
      { field: 'kind', reason: 'kind_mismatch' },
    ]);
    expect(validateCorrectionContent(detailed(), 'quick')).toEqual([
      { field: 'kind', reason: 'kind_mismatch' },
    ]);
  });

  it('refuses invisible control characters but allows line breaks in the text', () => {
    const withBreaks = normaliseContent(
      aQuickInput({ content: { kind: 'quick', story: `${STORY}\nSecond line.\tTabbed.` } }),
      'en',
    );
    expect(validateCorrectionContent(withBreaks, 'quick')).toEqual([]);

    const hidden = normaliseContent(
      aQuickInput({
        title: `Title${String.fromCodePoint(0x200b)}`,
        content: { kind: 'quick', story: `${STORY}${String.fromCodePoint(0x202e)}` },
      }),
      'en',
    );
    expect(validateCorrectionContent(hidden, 'quick')).toEqual([
      { field: 'title', reason: 'control_character' },
      { field: 'story', reason: 'control_character' },
    ]);

    const section = normaliseContent(
      aDetailedInput({ diagnosis: `Typhoid, confirmed\u0000.` }),
      'en',
    );
    expect(validateCorrectionContent(section, 'detailed')).toEqual([
      { field: 'diagnosis', reason: 'control_character' },
    ]);
  });

  it('allows the Bengali joiners ZWJ and ZWNJ in the title, story and sections (FD-114)', () => {
    const cp = (...points: number[]) => String.fromCodePoint(...points);
    const zwj = cp(0x09b0, 0x200d, 0x09cd, 0x09af, 0x09be, 0x09ac);
    const zwnj = cp(0x0989, 0x09a6, 0x09cd, 0x200c, 0x09af, 0x09be, 0x09aa, 0x09a8);
    const quickText = normaliseContent(
      aQuickInput({ title: zwj, content: { kind: 'quick', story: `${STORY} ${zwj} ${zwnj}` } }),
      'bn',
    );
    expect(quickText.title).toBe(zwj);
    expect(validateCorrectionContent(quickText, 'quick')).toEqual([]);

    const sections = normaliseContent(aDetailedInput({ diagnosis: `${STORY} ${zwnj}` }), 'bn');
    expect(validateCorrectionContent(sections, 'detailed')).toEqual([]);
  });
});

describe('validateClaims', () => {
  it('accepts the three codes', () => {
    expect(validateClaims(['wrongDx', 'wrongRx', 'secondOpinion'], [])).toEqual([]);
  });

  it('refuses a new free-text label', () => {
    expect(validateClaims(['The doctor was wrong'], ['wrongDx'])).toEqual([
      { field: 'claims', reason: 'label_not_allowed' },
    ]);
  });

  it('keeps a stored free-text label sent exactly as stored', () => {
    expect(validateClaims(['Seeded claim'], ['Seeded claim'])).toEqual([]);
  });

  it('refuses a reworded stored label', () => {
    expect(validateClaims(['Seeded claim!'], ['Seeded claim'])).toEqual([
      { field: 'claims', reason: 'label_not_allowed' },
    ]);
  });

  it('allows a stored label to be removed', () => {
    expect(validateClaims(['wrongRx'], ['Seeded claim', 'wrongRx'])).toEqual([]);
  });

  it('refuses a label sent twice', () => {
    expect(validateClaims(['wrongDx', 'wrongDx'], [])).toEqual([
      { field: 'claims', reason: 'duplicate_label' },
    ]);
  });
});

describe('classifyChange', () => {
  it('finds no change for identical content', () => {
    expect(classifyChange(quick(), quick())).toEqual({ changed: [], corrected: [] });
    expect(classifyChange(detailed(), detailed())).toEqual({ changed: [], corrected: [] });
  });

  it('treats a title-only edit as presentation, with an empty corrected list', () => {
    expect(classifyChange(quick(), quick({ title: 'Another title' }))).toEqual({
      changed: ['title'],
      corrected: [],
    });
  });

  it.each<[CorrectionField, Partial<ReviewContent>]>([
    ['story', { body: `${STORY} More.` }],
    ['sentiment', { sentiment: 'negative' }],
    ['outcome', { outcome: 'worse' }],
    ['claims', { claims: ['wrongRx'] }],
  ])('names %s for a quick review', (field, change) => {
    expect(classifyChange(quick(), quick(change))).toEqual({
      changed: [field],
      corrected: [field],
    });
  });

  it.each(['symptoms', 'diagnosis', 'treatment', 'after'] as const)(
    'names the %s section for a detailed review',
    (key) => {
      const current = detailed();
      const next = detailed({ sections: { ...current.sections, [key]: 'Changed text here.' } });
      expect(classifyChange(current, next)).toEqual({ changed: [key], corrected: [key] });
    },
  );

  it('names a removed section and a cleared outcome', () => {
    const current = detailed();
    const next = detailed({ sections: { symptoms: 'Fever for three days.' }, outcome: null });
    expect(classifyChange(current, next).corrected).toEqual(['diagnosis', 'outcome']);
  });

  it('compares claims as sets, so a reorder is no change', () => {
    const current = quick({ claims: ['wrongDx', 'Seeded claim'] });
    const next = quick({ claims: ['Seeded claim', 'wrongDx'] });
    expect(classifyChange(current, next)).toEqual({ changed: [], corrected: [] });
  });

  it('lists title first and the material parts in the fixed order', () => {
    const current = detailed();
    const next = detailed({
      title: 'New',
      claims: [],
      outcome: 'helped',
      sentiment: 'positive',
      sections: { after: 'Recovered well after treatment.' },
    });
    expect(classifyChange(current, next)).toEqual({
      changed: ['title', 'symptoms', 'diagnosis', 'after', 'sentiment', 'outcome', 'claims'],
      corrected: ['symptoms', 'diagnosis', 'after', 'sentiment', 'outcome', 'claims'],
    });
  });

  it('keeps the fixed order of ENT-103', () => {
    expect(CORRECTION_FIELD_ORDER).toEqual([
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

describe('toVersionSnapshot', () => {
  it('holds the full quick content, the claims as labels and the corrected list', () => {
    expect(toVersionSnapshot(quick({ claims: ['wrongDx'] }), ['story'])).toEqual({
      kind: 'quick',
      title: 'A careful doctor',
      body: STORY,
      sentiment: 'positive',
      outcome: 'helped',
      claims: [{ label: 'wrongDx' }],
      corrected: ['story'],
    });
  });

  it('holds the sections of a detailed review and no body', () => {
    const snapshot = toVersionSnapshot(detailed(), []);
    expect(snapshot.sections).toEqual({
      symptoms: 'Fever for three days.',
      diagnosis: 'Typhoid, confirmed by a test.',
    });
    expect(snapshot).not.toHaveProperty('body');
    expect(snapshot.corrected).toEqual([]);
  });

  it('holds no persona, account, doctor, identity mode or exact date', () => {
    const snapshot = toVersionSnapshot(quick(), ['outcome']);
    expect(Object.keys(snapshot).sort()).toEqual(
      ['body', 'claims', 'corrected', 'kind', 'outcome', 'sentiment', 'title'].sort(),
    );
    const keys = Object.keys(snapshot).join(' ');
    for (const key of ['persona', 'account', 'doctor', 'identity', 'exactDate', 'language']) {
      expect(keys).not.toContain(key);
    }
  });
});

const PUBLISHED = new Date('2026-03-10T08:00:00.000Z');
const FIRST_EDIT = new Date('2026-04-02T09:30:00.000Z');
const SECOND_EDIT = new Date('2026-05-20T18:45:00.000Z');

// A publish row's snapshot has no `corrected` key (U47 BR4.7).
function publishRow(content: unknown = toVersionSnapshot(quick(), [])): VersionHistoryRow {
  const publish = Object.fromEntries(
    Object.entries(content as Record<string, unknown>).filter(([key]) => key !== 'corrected'),
  );
  return {
    version: 1,
    changeKind: 'publish',
    createdAt: PUBLISHED,
    corrected: undefined,
    content: publish,
  };
}

function correctionRow(
  version: number,
  createdAt: Date,
  corrected: unknown,
  content?: unknown,
): VersionHistoryRow {
  return {
    version,
    changeKind: 'correction',
    createdAt,
    corrected,
    ...(content !== undefined ? { content } : {}),
  };
}

describe('readCorrected', () => {
  it('reads a missing or malformed value as []', () => {
    expect(readCorrected(undefined)).toEqual([]);
    expect(readCorrected(null)).toEqual([]);
    expect(readCorrected('story')).toEqual([]);
    expect(readCorrected({ story: true })).toEqual([]);
    expect(readCorrected([1, 'title', 'unknown'])).toEqual([]);
  });

  it('keeps known fields once, in the fixed order', () => {
    expect(readCorrected(['claims', 'story', 'claims', 'nope'])).toEqual(['story', 'claims']);
  });
});

describe('toHistory', () => {
  it('gives an unedited review no editedAt and no corrections', () => {
    expect(toHistory([publishRow()], false)).toEqual({ corrections: [] });
  });

  it('gives the non-author no versions key at all', () => {
    const rows = [publishRow(), correctionRow(2, FIRST_EDIT, ['outcome'])];
    const history = toHistory(rows, false);
    expect(history).not.toHaveProperty('versions');
    expect(history.editedAt).toBe(FIRST_EDIT.toISOString());
  });

  it('gives the author every version newest first with its kind and fields', () => {
    const rows = [
      publishRow(),
      correctionRow(2, FIRST_EDIT, []),
      correctionRow(3, SECOND_EDIT, ['story', 'outcome']),
    ];
    expect(toHistory(rows, true).versions).toEqual([
      {
        version: 3,
        at: SECOND_EDIT.toISOString(),
        kind: 'corrected',
        fields: ['story', 'outcome'],
      },
      { version: 2, at: FIRST_EDIT.toISOString(), kind: 'edited', fields: [] },
      { version: 1, at: PUBLISHED.toISOString(), kind: 'published', fields: [] },
    ]);
  });

  it('builds each material correction from the version just before it, oldest first', () => {
    const v1 = toVersionSnapshot(quick(), []);
    const v2 = toVersionSnapshot(quick({ outcome: 'worse' }), ['outcome']);
    const rows = [
      // Out of order on purpose: the history sorts by version.
      correctionRow(3, SECOND_EDIT, ['story']),
      publishRow(v1),
      correctionRow(2, FIRST_EDIT, ['outcome'], v2),
    ];
    const history = toHistory(rows, false);
    expect(history.editedAt).toBe(SECOND_EDIT.toISOString());
    expect(history.corrections).toEqual([
      {
        at: FIRST_EDIT.toISOString(),
        fields: ['outcome'],
        // No labels and the labels not corrected: nothing to show for them.
        original: {
          kind: 'quick',
          title: 'A careful doctor',
          story: STORY,
          sentiment: 'positive',
          outcome: 'helped',
        },
      },
      {
        at: SECOND_EDIT.toISOString(),
        fields: ['story'],
        original: {
          kind: 'quick',
          title: 'A careful doctor',
          story: STORY,
          sentiment: 'positive',
          outcome: 'worse',
        },
      },
    ]);
  });

  it('adds no line and no original for a title-only edit', () => {
    const history = toHistory([publishRow(), correctionRow(2, FIRST_EDIT, [])], false);
    expect(history).toEqual({ editedAt: FIRST_EDIT.toISOString(), corrections: [] });
  });

  it('reads a correction row without corrected as Edited with no line', () => {
    const history = toHistory([publishRow(), correctionRow(2, FIRST_EDIT, undefined)], true);
    expect(history.corrections).toEqual([]);
    expect(history.editedAt).toBe(FIRST_EDIT.toISOString());
    expect(history.versions?.[0]).toMatchObject({ version: 2, kind: 'edited', fields: [] });
  });

  it('gives a partial seed snapshot an original without the missing keys', () => {
    const seed = { title: 'সিড শিরোনাম', body: 'সিড অভিজ্ঞতার পুরো লেখা এখানে।', sections: null };
    const rows: VersionHistoryRow[] = [
      {
        version: 1,
        changeKind: 'publish',
        createdAt: PUBLISHED,
        corrected: undefined,
        content: seed,
      },
      correctionRow(2, FIRST_EDIT, ['story']),
    ];
    const [line] = toHistory(rows, false).corrections;
    expect(line?.original).toEqual({
      kind: 'quick',
      title: 'সিড শিরোনাম',
      story: 'সিড অভিজ্ঞতার পুরো লেখা এখানে।',
    });
    const text = JSON.stringify(line?.original);
    expect(text).not.toContain('Not provided');
    expect(text).not.toMatch(/:0\b/);
  });

  it('reads a detailed original from its sections when the snapshot names no kind', () => {
    const original = toOriginalText({
      title: 'Seed detailed',
      body: null,
      sections: { diagnosis: 'Malaria.', treatment: '', after: 42 },
      sentiment: null,
      claims: [{ label: 'Seeded claim' }, 'wrongDx', 7],
    });
    expect(original).toEqual({
      kind: 'detailed',
      title: 'Seed detailed',
      sections: { diagnosis: 'Malaria.' },
      claims: ['Seeded claim', 'wrongDx'],
    });
  });

  it('reads a legacy seed snapshot with a summary body and sections as detailed (review R-01)', () => {
    // The pre-fix seed wrote the quick summary beside the sections and no kind.
    const seed = {
      title: 'সিড বিস্তারিত',
      body: 'সারসংক্ষেপ, যা পাতায় দেখানো হয় না।',
      sections: { symptoms: 'তিন দিন ধরে জ্বর।', after: 'এক সপ্তাহে সেরে গেছে।' },
    };
    const [line] = toHistory(
      [
        {
          version: 1,
          changeKind: 'publish',
          createdAt: PUBLISHED,
          corrected: undefined,
          content: seed,
        },
        correctionRow(2, FIRST_EDIT, ['symptoms']),
      ],
      false,
    ).corrections;
    expect(line?.original).toEqual({
      kind: 'detailed',
      title: 'সিড বিস্তারিত',
      sections: { symptoms: 'তিন দিন ধরে জ্বর।', after: 'এক সপ্তাহে সেরে গেছে।' },
    });
    expect(line?.original).not.toHaveProperty('story');
  });

  it('reads a legacy quick seed snapshot with no sections as quick', () => {
    expect(
      toOriginalText({ title: 'Seed quick', body: 'The seeded quick story.', sections: {} }),
    ).toEqual({ kind: 'quick', title: 'Seed quick', story: 'The seeded quick story.' });
  });

  it('reads a complete seed snapshot by its kind, sentiment, outcome and labels', () => {
    const detailedSeed = {
      kind: 'detailed',
      title: 'Seed detailed',
      sections: { diagnosis: 'Typhoid.' },
      sentiment: 'mixed',
      outcome: 'helped',
      claims: [{ label: 'wrongDx' }],
    };
    expect(toOriginalText(detailedSeed, ['outcome'])).toEqual({
      kind: 'detailed',
      title: 'Seed detailed',
      sections: { diagnosis: 'Typhoid.' },
      sentiment: 'mixed',
      outcome: 'helped',
      claims: ['wrongDx'],
    });
  });

  it('keeps an empty earlier value as Not provided only for a field the correction names (review R-02)', () => {
    const v1 = { ...toVersionSnapshot(quick({ sentiment: null, outcome: null }), []) };
    const corrected = toOriginalText(v1, ['sentiment', 'outcome', 'claims']);
    expect(corrected).toMatchObject({ sentiment: null, outcome: null, claims: [] });

    const storyOnly = toOriginalText(v1, ['story']);
    expect(storyOnly).not.toHaveProperty('sentiment');
    expect(storyOnly).not.toHaveProperty('outcome');
    expect(storyOnly).not.toHaveProperty('claims');
  });

  it('leaves out a named field the legacy snapshot lacks entirely', () => {
    const original = toOriginalText({ title: 'Seed', body: 'The seeded quick story.' }, [
      'sentiment',
      'outcome',
      'claims',
    ]);
    expect(original).toEqual({ kind: 'quick', title: 'Seed', story: 'The seeded quick story.' });
  });

  it('passes the correction fields to the original in the history', () => {
    const v1 = toVersionSnapshot(quick({ outcome: null }), []);
    const v2 = toVersionSnapshot(quick({ outcome: 'worse' }), ['outcome']);
    const [line] = toHistory(
      [publishRow(v1), correctionRow(2, FIRST_EDIT, ['outcome'], v2)],
      false,
    ).corrections;
    expect(line?.original.outcome).toBeNull();
    expect(line?.original.sentiment).toBe('positive');
  });

  it('never carries an actor, persona, account or reason', () => {
    const rows = [
      publishRow(),
      correctionRow(2, FIRST_EDIT, ['outcome'], toVersionSnapshot(quick(), ['outcome'])),
    ];
    const text = JSON.stringify(toHistory(rows, true));
    for (const key of ['actor', 'persona', 'account', 'reason']) {
      expect(text).not.toContain(key);
    }
  });

  it('leaves moderation rows out of the author list', () => {
    const rows: VersionHistoryRow[] = [
      publishRow(),
      {
        version: 2,
        changeKind: 'moderation_redaction',
        createdAt: FIRST_EDIT,
        corrected: undefined,
      },
    ];
    const history = toHistory(rows, true);
    expect(history.versions?.map((v) => v.version)).toEqual([1]);
    expect(history).not.toHaveProperty('editedAt');
  });
});
