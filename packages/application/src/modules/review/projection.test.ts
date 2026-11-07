import {
  DraftPayload,
  type ExperienceCardVM,
  type IdentityMode,
  type PersonaPublicVM,
} from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  claimOf,
  pageBylineOf,
  toExperiencePage,
  toFacilityAccount,
  type PageDeps,
  type PublishedReviewForPage,
} from './projection';
import {
  aDraftPayload,
  anAnonymousActor,
  deepKeys,
  expectOk,
  makeReviewModuleWorld,
} from './review-test-support';

function aPageReview(overrides: Partial<PublishedReviewForPage> = {}): PublishedReviewForPage {
  return {
    publicId: 'r000000101',
    kind: 'quick',
    title: 'A careful visit',
    body: 'The doctor listened and wrote the plan down for me.',
    sections: null,
    language: 'en',
    sentiment: 'positive',
    outcome: 'helped',
    claims: [],
    tags: [],
    relationship: 'self',
    periodYear: 2026,
    periodMonth: 3,
    publishedAt: new Date('2026-10-20T20:30:00.000Z'),
    ...overrides,
  };
}

function aCard(publicId: string): ExperienceCardVM {
  return {
    publicId,
    title: 'Another visit',
    excerpt: 'A short synthetic excerpt.',
    truncated: false,
    documentsCount: 0,
    author: { personaKind: 'pseudonymous', username: 'member_7' },
    relationship: 'self',
    period: { year: 2026, month: 2 },
    doctor: { publicId: 'd000000101', name: 'Dr. Synthetic Rahman' },
  };
}

function aPageDeps(overrides: Partial<PageDeps> = {}): PageDeps {
  return {
    doctor: {
      publicId: 'd000000101',
      name: 'Dr. Synthetic Rahman',
      specialty: null,
      memberAddedNotConfirmed: false,
    },
    byline: { personaKind: 'pseudonymous', username: 'member_7' },
    related: {
      relatedByCondition: [aCard('r000000102')],
      sameDoctor: [aCard('r000000103')],
      otherByAuthor: [aCard('r000000104')],
    },
    ...overrides,
  };
}

describe('toExperiencePage', () => {
  it('leaves an absent sentiment and outcome out, so the page renders Not provided', () => {
    const page = toExperiencePage(aPageReview({ sentiment: null, outcome: null }), aPageDeps());

    expect(page).not.toHaveProperty('sentiment');
    expect(page).not.toHaveProperty('outcome');
  });

  it("frames claims as Reviewer's labels: known codes as codes, seeded labels as written", () => {
    const page = toExperiencePage(
      aPageReview({ claims: [{ label: 'wrongDx' }, { label: 'Doctor ignored my reports' }] }),
      aPageDeps(),
    );

    expect(page.claims).toEqual([{ code: 'wrongDx' }, { text: 'Doctor ignored my reports' }]);
    expect(claimOf('secondOpinion')).toEqual({ code: 'secondOpinion' });
  });

  it('orders the sections of a detailed review on the timeline and omits empty ones', () => {
    const page = toExperiencePage(
      aPageReview({
        kind: 'detailed',
        body: null,
        sections: { after: 'Better in a week.', symptoms: 'A dry cough.', treatment: '  ' },
      }),
      aPageDeps(),
    );

    expect(page.sections.map((s) => s.key)).toEqual(['symptoms', 'after']);
    expect(page).not.toHaveProperty('story');
  });

  it('shows the period as month and year only and the posted date as a date', () => {
    const page = toExperiencePage(aPageReview(), aPageDeps());

    expect(page.period).toEqual({ year: 2026, month: 3 });
    expect(page.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 20:30 UTC on 20 October is 21 October in Dhaka.
    expect(page.publishedAt).toBe('2026-10-21');
  });

  it("drops the page's own review from every related list", () => {
    const deps = aPageDeps({
      related: {
        relatedByCondition: [aCard('r000000101'), aCard('r000000102')],
        sameDoctor: [aCard('r000000101')],
        otherByAuthor: [aCard('r000000101'), aCard('r000000104')],
      },
    });

    const page = toExperiencePage(aPageReview(), deps);

    expect(page.relatedByCondition.map((c) => c.publicId)).toEqual(['r000000102']);
    expect(page.sameDoctor).toEqual([]);
    expect(page.otherByAuthor.map((c) => c.publicId)).toEqual(['r000000104']);
  });

  it('keeps otherByAuthor empty for an anonymous review', () => {
    const page = toExperiencePage(
      aPageReview(),
      aPageDeps({ byline: { personaKind: 'anonymous', alias: 'patient-ab23' } }),
    );

    expect(page.otherByAuthor).toEqual([]);
    expect(page.byline).toEqual({ personaKind: 'anonymous', alias: 'patient-ab23' });
  });

  it('links a condition tag only to an active term and keeps a Not sure tag', () => {
    const page = toExperiencePage(
      aPageReview({
        tags: [
          {
            group: 'condition',
            notSure: false,
            termPublicId: 't000000101',
            termName: 'Synthetic cough',
            provisional: false,
            termActive: true,
            freeText: null,
          },
          {
            group: 'condition',
            notSure: false,
            termPublicId: 't000000102',
            termName: 'Retired term',
            provisional: true,
            termActive: false,
            freeText: null,
          },
          { group: 'condition', notSure: true },
        ],
      }),
      aPageDeps(),
    );

    expect(page.tags).toEqual([
      {
        group: 'condition',
        name: 'Synthetic cough',
        provisional: false,
        conditionPublicId: 't000000101',
      },
      { group: 'condition', name: 'Retired term', provisional: true },
      { group: 'condition', notSure: true },
    ]);
  });
});

describe('pageBylineOf', () => {
  const named: PersonaPublicVM = {
    kind: 'named',
    displayName: 'Shirin Demo',
    username: 'shirin_88',
    avatarHue: null,
  };
  const pseudonymous: PersonaPublicVM = {
    kind: 'pseudonymous',
    displayName: 'shirin_88',
    username: 'shirin_88',
    avatarHue: null,
  };
  const anonymous: PersonaPublicVM = {
    kind: 'anonymous',
    displayName: 'patient-ab23',
    avatarHue: 0,
  };

  it.each<[string, PersonaPublicVM | null, IdentityMode, object]>([
    ['named', named, 'named', { personaKind: 'named', displayName: 'Shirin Demo' }],
    [
      'pseudonymous',
      pseudonymous,
      'pseudonymous',
      { personaKind: 'pseudonymous', username: 'shirin_88' },
    ],
    ['anonymous', anonymous, 'anonymous', { personaKind: 'anonymous', alias: 'patient-ab23' }],
    [
      'anonymous mode over a named persona',
      named,
      'anonymous',
      { personaKind: 'anonymous', alias: null },
    ],
    ['a missing persona', null, 'named', { personaKind: 'anonymous', alias: null }],
  ])('builds the %s byline', (_label, persona, mode, expected) => {
    expect(pageBylineOf(persona, mode)).toEqual(expected);
  });

  it('never gives an anonymous byline a name, a username or initials', () => {
    const byline = pageBylineOf(anonymous, 'anonymous');

    expect(Object.keys(byline).sort()).toEqual(['alias', 'personaKind']);
  });
});

describe('toFacilityAccount', () => {
  it('lists only the answered criteria in the fixed order, with no score', () => {
    const payload = DraftPayload.parse(
      aDraftPayload('facility', {
        criteria: { overall: 'good', cleanliness: 'poor', staff: 'mixed' },
      }),
    );

    const vm = toFacilityAccount(payload, {
      author: { personaKind: 'named', displayName: 'Shirin Demo' },
    });

    expect(vm.criteria.map((c) => c.key)).toEqual(['staff', 'cleanliness', 'overall']);
    expect(vm.overall).toBe('good');
    expect(deepKeys(vm).some((k) => /score|rating|star|average/i.test(k))).toBe(false);
  });
});

function withoutSentiment(payload: ReturnType<typeof aDraftPayload>) {
  const copy: Record<string, unknown> = { ...payload };
  delete copy.sentiment;
  return copy as ReturnType<typeof aDraftPayload>;
}

const DENIED_KEYS = [
  'id',
  'accountId',
  'personaId',
  'authorPersonaId',
  'doctorId',
  'reviewId',
  'branchId',
  'exactDate',
  'exactDateEnc',
  'payloadEnc',
  'attestationAt',
  'email',
  'evidence',
  'rating',
  'score',
  'stars',
  'average',
];

describe('the public projection carries nothing private (BR5.9)', () => {
  it('scans every generated page for denied keys and private values', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    const pages: unknown[] = [];
    const variants = [
      { mode: 'named', body: w.payload('quick', { exactDate: '2026-03-14' }) },
      { mode: 'pseudonymous', body: w.payload('detailed', { claims: ['wrongRx'] }) },
      {
        mode: 'anonymous',
        body: withoutSentiment(w.payload('quick', { exactDate: '2026-03-02' })),
      },
      { mode: 'anonymous', body: w.payload('detailed', { exactDate: '2026-03-20' }) },
    ] as const;
    for (const variant of variants) {
      const publicId = await w.published(author, variant.mode, variant.body);
      for (const locale of ['en', 'bn'] as const) {
        const reader = w.callAs(anAnonymousActor({ locale }));
        pages.push(expectOk(await w.review.getExperience.execute({ publicId }, reader)));
      }
    }

    const keys = new Set(deepKeys(pages));
    for (const denied of DENIED_KEYS) expect(keys.has(denied)).toBe(false);
    const text = JSON.stringify(pages);
    const privateValues = [
      author.accountId,
      ...w.identity.store.personas.map((p) => p.id),
      ...w.reviews.reviews.map((r) => r.id),
      w.doctor.id,
      '2026-03-14',
      '2026-03-02',
      '2026-03-20',
    ];
    for (const value of privateValues) expect(text).not.toContain(value);
  });
});
