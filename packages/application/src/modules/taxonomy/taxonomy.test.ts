import { describe, expect, it } from 'vitest';

import {
  aConditionFigures,
  anAccountActor,
  FAKE_TX,
  makeModuleWorld,
  readerIn,
} from '../directory/directory-test-support';
import { CREATE_PROVISIONAL_LIMIT } from './deps';

const LOCALES = ['en', 'bn'] as const;

describe.each(LOCALES)('taxonomy.getCondition in %s', (locale) => {
  it('maps the term with its aliases and the port figures', async () => {
    const world = makeModuleWorld();
    const term = world.repos.taxonomy.addTerm(
      { nameEn: 'Type 2 diabetes', nameBn: 'টাইপ ২ ডায়াবেটিস' },
      ['sugar', 'টাইপ ২ ডায়াবেটিস'],
    );
    world.conditionStats.figures = aConditionFigures({ total: 4, doctorsTotal: 2 });

    const result = await world.taxonomy.getCondition.execute(
      { publicId: term.publicId },
      world.callAs(readerIn(locale)),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe(locale === 'bn' ? 'টাইপ ২ ডায়াবেটিস' : 'Type 2 diabetes');
    expect(result.data.aliases).toEqual(
      locale === 'bn' ? ['sugar'] : ['sugar', 'টাইপ ২ ডায়াবেটিস'],
    );
    expect(result.data).toMatchObject({ accountsTotal: 4, doctorsTotal: 2, provisional: false });
    expect(world.conditionStats.calls).toEqual([`forCondition:${term.id}`]);
  });
});

describe('taxonomy.getCondition', () => {
  it('serves a provisional term marked provisional', async () => {
    const world = makeModuleWorld();
    const term = world.repos.taxonomy.addTerm({ provisional: true });

    const result = await world.taxonomy.getCondition.execute(
      { publicId: term.publicId },
      world.callAs(readerIn('en')),
    );

    expect(result.ok && result.data.provisional).toBe(true);
  });

  it('answers not_found for a hidden, mapped or non-condition term', async () => {
    const world = makeModuleWorld();
    const target = world.repos.taxonomy.addTerm();
    const terms = [
      world.repos.taxonomy.addTerm({ published: false }),
      world.repos.taxonomy.addTerm({ canonicalId: target.id }),
      world.repos.taxonomy.addTerm({ kind: 'medicine' }),
    ];
    for (const term of terms) {
      const result = await world.taxonomy.getCondition.execute(
        { publicId: term.publicId },
        world.callAs(readerIn('en')),
      );
      expect(!result.ok && result.error.code).toBe('not_found');
    }
  });
});

describe.each(LOCALES)('taxonomy.listConditions in %s', (locale) => {
  it('lists every canonical condition by name, zero-count ones included', async () => {
    const world = makeModuleWorld();
    const b = world.repos.taxonomy.addTerm({ nameEn: 'Bronchitis', nameBn: 'ব্রঙ্কাইটিস' });
    const a = world.repos.taxonomy.addTerm({ nameEn: 'Asthma', nameBn: 'হাঁপানি' });
    world.repos.taxonomy.addTerm({ provisional: true });
    world.conditionStats.totals.set(a.id, 3);

    const result = await world.taxonomy.listConditions.execute({}, world.callAs(readerIn(locale)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const order = locale === 'bn' ? [b, a] : [a, b];
    expect(result.data.map((c) => c.publicId)).toEqual(order.map((t) => t.publicId));
    expect(result.data.find((c) => c.publicId === b.publicId)?.accountsTotal).toBe(0);
    expect(result.data.find((c) => c.publicId === a.publicId)?.accountsTotal).toBe(3);
  });
});

describe('taxonomy.resolve', () => {
  it('matches a name or an alias exactly after normalising', async () => {
    const world = makeModuleWorld();
    const term = world.repos.taxonomy.addTerm({ nameEn: 'Thyroid (hypothyroidism)' }, ['thyroid']);

    const byName = await world.taxonomy.resolve.execute(
      { text: 'thyroid hypothyroidism' },
      world.callAs(readerIn('en')),
    );
    const byAlias = await world.taxonomy.resolve.execute(
      { text: ' Thyroid ' },
      world.callAs(readerIn('en')),
    );

    expect(byName.ok && byName.data).toMatchObject({ termId: term.id, provisional: false });
    expect(byName.ok && byName.data).not.toHaveProperty('matchedAlias');
    expect(byAlias.ok && byAlias.data).toMatchObject({ termId: term.id, matchedAlias: 'thyroid' });
  });

  it('returns nothing for no match, ambiguous for two, and validation for punctuation', async () => {
    const world = makeModuleWorld();
    world.repos.taxonomy.addTerm({}, ['sugar']);
    world.repos.taxonomy.addTerm({ kind: 'symptom' }, ['sugar']);

    const none = await world.taxonomy.resolve.execute(
      { text: 'gout' },
      world.callAs(readerIn('en')),
    );
    const two = await world.taxonomy.resolve.execute(
      { text: 'sugar' },
      world.callAs(readerIn('en')),
    );
    const one = await world.taxonomy.resolve.execute(
      { text: 'sugar', kind: 'symptom' },
      world.callAs(readerIn('en')),
    );
    const bad = await world.taxonomy.resolve.execute({ text: '--' }, world.callAs(readerIn('en')));

    expect(none.ok && none.data).toEqual({});
    expect(two.ok && two.data).toEqual({ ambiguous: true });
    expect(one.ok && 'termId' in one.data).toBe(true);
    expect(!bad.ok && bad.error.code).toBe('validation');
  });
});

describe('taxonomy.listSuggested', () => {
  it('returns the suggested terms of the group in suggested order', async () => {
    const world = makeModuleWorld();
    const second = world.repos.taxonomy.addTerm({ suggested: true, suggestedOrder: 1 });
    const first = world.repos.taxonomy.addTerm({ suggested: true, suggestedOrder: 0 });
    world.repos.taxonomy.addTerm({ suggested: false });

    const result = await world.taxonomy.listSuggested.execute(
      { group: 'condition' },
      world.callAs(readerIn('bn')),
    );

    expect(result.ok && result.data.map((t) => t.termId)).toEqual([first.id, second.id]);
    expect(result.ok && result.data[0]?.name).toBe(first.nameBn);
  });
});

describe('taxonomy.createProvisional', () => {
  const input = { kind: 'condition', text: 'হাইপোথাইরয়েড', lang: 'bn' } as const;

  it('creates one provisional term with its alias, audit row and term.changed', async () => {
    const world = makeModuleWorld();
    const account = await world.addAccount();

    const result = await world.taxonomy.createProvisional.execute(
      input,
      world.callAs(anAccountActor(account)),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const term = world.repos.taxonomy.terms.get(result.data.termId);
    expect(term).toMatchObject({ provisional: true, nameEn: input.text, nameBn: input.text });
    expect(world.repos.taxonomy.aliases).toMatchObject([{ alias: input.text, lang: 'bn' }]);
    expect(world.fakes.audit.events).toMatchObject([
      {
        action: 'term.provisional_created',
        actor: `account:${account.accountId}`,
        details: { termId: result.data.termId, kind: 'condition', lang: 'bn' },
      },
    ]);
    expect(JSON.stringify(world.fakes.audit.events)).not.toContain(input.text);
    expect(world.fakes.outbox.events).toEqual([
      { name: 'term.changed', payload: { id: result.data.termId } },
    ]);
    expect(world.fakes.rateLimiter.calls[0]?.key).toBe(
      `taxonomy.createProvisional:account:${account.accountId}`,
    );
  });

  it('returns the same term for a repeat and for a known wording, writing nothing', async () => {
    const world = makeModuleWorld();
    const account = await world.addAccount();
    const known = world.repos.taxonomy.addTerm({ nameEn: 'Asthma' });
    const call = world.callAs(anAccountActor(account));

    const first = await world.taxonomy.createProvisional.execute(input, call);
    const again = await world.taxonomy.createProvisional.execute(
      { ...input, text: ' হাইপোথাইরয়েড ' },
      call,
    );
    const asthma = await world.taxonomy.createProvisional.execute(
      { kind: 'condition', text: 'ASTHMA', lang: 'en' },
      call,
    );

    expect(first.ok && again.ok && again.data.termId === first.data.termId).toBe(true);
    expect(asthma.ok && asthma.data.termId).toBe(known.id);
    expect(world.fakes.audit.events).toHaveLength(1);
  });

  it.each([
    ['a visitor', 'anonymous', 'forbidden'],
    ['an unverified account', 'pending_verification', 'auth.email_unverified'],
    ['a restricted account', 'restricted', 'forbidden'],
  ] as const)('refuses %s and writes nothing', async (_who, status, code) => {
    const world = makeModuleWorld();
    const actor =
      status === 'anonymous' ? readerIn('en') : anAccountActor(await world.addAccount({ status }));

    const result = await world.taxonomy.createProvisional.execute(input, world.callAs(actor));

    expect(!result.ok && result.error.code).toBe(code);
    expect(world.repos.taxonomy.terms.size).toBe(0);
    expect(world.fakes.audit.events).toEqual([]);
  });

  it('refuses the 31st call in an hour with rate_limited', async () => {
    const world = makeModuleWorld();
    const call = world.callAs(anAccountActor(await world.addAccount()));
    for (let i = 0; i < CREATE_PROVISIONAL_LIMIT; i += 1) {
      const ok = await world.taxonomy.createProvisional.execute(input, call);
      expect(ok.ok).toBe(true);
    }

    const refused = await world.taxonomy.createProvisional.execute(input, call);

    expect(!refused.ok && refused.error.code).toBe('rate_limited');
  });
});

describe('the provisional-term operation inside a caller transaction', () => {
  it('names the persona in the audit row and no account', async () => {
    const world = makeModuleWorld();

    const result = await world.taxonomy.ensureProvisionalTerm(
      FAKE_TX,
      { kind: 'medicine', text: 'Synthetic tonic', lang: 'en' },
      'persona:persona-9',
      'corr-1',
    );

    expect(result.ok && result.data.created).toBe(true);
    expect(world.fakes.audit.events[0]?.actor).toBe('persona:persona-9');
    expect(JSON.stringify(world.fakes.audit.events)).not.toMatch(/account/);
  });

  it('returns the concurrent winner when its insert loses the race', async () => {
    const world = makeModuleWorld();
    const winner = world.repos.taxonomy.addTerm({
      kind: 'condition',
      provisional: true,
      published: false,
      nameEn: 'gout flare',
    });

    const result = await world.taxonomy.ensureProvisionalTerm(
      FAKE_TX,
      { kind: 'condition', text: 'Gout flare', lang: 'en' },
      'persona:persona-9',
      'corr-1',
    );

    expect(result.ok && result.data).toEqual({ termId: winner.id, created: false });
    expect(world.fakes.audit.events).toEqual([]);
  });
});
