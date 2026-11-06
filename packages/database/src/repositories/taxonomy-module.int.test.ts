import { newId, newPublicId } from '@rogikotha/contracts';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { taxonomyAliases, taxonomyTerms } from '../schema/taxonomy';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { buildAlias, buildTerm, uniqueSuffix } from './directory-test-support';
import { PgTaxonomyModuleRepository } from './taxonomy-module';

const repo = new PgTaxonomyModuleRepository();
const tx = appTxOf(testDb);

describe('PgTaxonomyModuleRepository reads', () => {
  it('finds a term by public id whatever its state, telling whether it is published', async () => {
    const hidden = await buildTerm(testDb, { state: 'hidden' });

    expect(await repo.findTermByPublicId(tx, hidden.publicId)).toMatchObject({
      id: hidden.id,
      kind: 'condition',
      provisional: false,
      canonicalId: null,
      published: false,
    });
    expect(await repo.findTermByPublicId(tx, newPublicId())).toBeNull();
  });

  it('lists the active terms of a kind by name, with or without provisional ones', async () => {
    const run = uniqueSuffix();
    const b = await buildTerm(testDb, { kind: 'symptom', nameEn: `${run} B`, nameBn: `${run} ক` });
    const a = await buildTerm(testDb, { kind: 'symptom', nameEn: `${run} A`, nameBn: `${run} খ` });
    const provisional = await buildTerm(testDb, {
      kind: 'symptom',
      nameEn: `${run} C`,
      provisional: true,
    });
    const hidden = await buildTerm(testDb, { kind: 'symptom', state: 'hidden' });
    const mapped = await buildTerm(testDb, { kind: 'symptom', canonicalId: a.id });
    const mine = (rows: { id: string }[]) =>
      rows
        .map((r) => r.id)
        .filter((id) => [a.id, b.id, provisional.id, hidden.id, mapped.id].includes(id));

    const all = await repo.listTerms(tx, 'symptom', { canonicalOnly: false, locale: 'en' });
    const canonical = await repo.listTerms(tx, 'symptom', { canonicalOnly: true, locale: 'en' });
    const bn = await repo.listTerms(tx, 'symptom', { canonicalOnly: true, locale: 'bn' });

    expect(mine(all)).toEqual([a.id, b.id, provisional.id]);
    expect(mine(canonical)).toEqual([a.id, b.id]);
    expect(mine(bn)).toEqual([b.id, a.id]);
  });

  it('returns a term’s aliases as written, by alias', async () => {
    const term = await buildTerm(testDb);
    await buildAlias(testDb, term.id, 'Sugar', 'sugar');
    await buildAlias(testDb, term.id, 'Diabetes mellitus', 'diabetesmellitus');

    expect(await repo.aliasesOf(tx, term.id)).toEqual(['Diabetes mellitus', 'Sugar']);
  });

  it('finds active terms by name key or alias key, as effective terms, each once', async () => {
    const key = `key-${uniqueSuffix()}`;
    const byName = await buildTerm(testDb, { nameKeyEn: key });
    const canonical = await buildTerm(testDb);
    const mapped = await buildTerm(testDb, { canonicalId: canonical.id });
    await buildAlias(testDb, mapped.id, 'Mapped wording', key);
    await buildAlias(testDb, canonical.id, 'Canonical wording', key);
    const hidden = await buildTerm(testDb, { state: 'hidden', nameKeyEn: `${key}-x` });
    await buildAlias(testDb, hidden.id, 'Hidden wording', key);

    const matches = await repo.findByKey(tx, key);

    expect(matches.map((m) => m.term.id).sort()).toEqual([byName.id, canonical.id].sort());
    expect(matches.find((m) => m.term.id === byName.id)?.matchedAlias).toBeNull();
    expect(['Mapped wording', 'Canonical wording']).toContain(
      matches.find((m) => m.term.id === canonical.id)?.matchedAlias,
    );
    expect(await repo.findByKey(tx, key, 'symptom')).toEqual([]);
  });

  it('leaves a mapped term out when its canonical target is hidden (BR1.6)', async () => {
    const key = `key-${uniqueSuffix()}`;
    const hiddenTarget = await buildTerm(testDb, { state: 'hidden' });
    await buildTerm(testDb, { canonicalId: hiddenTarget.id, nameKeyEn: key });

    expect(await repo.findByKey(tx, key)).toEqual([]);
  });

  it('lists suggested terms by suggested order, then name, leaving hidden ones out', async () => {
    const run = uniqueSuffix();
    const second = await buildTerm(testDb, {
      kind: 'medicine',
      nameEn: `${run} A`,
      suggested: true,
      suggestedOrder: 1,
    });
    const first = await buildTerm(testDb, {
      kind: 'medicine',
      nameEn: `${run} Z`,
      suggested: true,
      suggestedOrder: 0,
    });
    const hidden = await buildTerm(testDb, {
      kind: 'medicine',
      suggested: true,
      suggestedOrder: 0,
      state: 'hidden',
    });
    const plain = await buildTerm(testDb, { kind: 'medicine' });

    const ids = (await repo.listSuggested(tx, 'medicine', 'en'))
      .map((t) => t.id)
      .filter((id) => [first.id, second.id, hidden.id, plain.id].includes(id));

    expect(ids).toEqual([first.id, second.id]);
  });
});

describe('PgTaxonomyModuleRepository provisional terms (BR5.2)', () => {
  it('inserts a provisional term with the wording in both names and no account column', async () => {
    const key = `prov-${uniqueSuffix()}`;
    const id = newId();

    const inserted = await repo.insertProvisional(tx, {
      id,
      publicId: newPublicId(),
      kind: 'treatment',
      text: '  Cold compress ',
      key,
    });

    expect(inserted).toEqual({ termId: id });
    const [row] = await testDb.select().from(taxonomyTerms).where(eq(taxonomyTerms.id, id));
    expect(row).toMatchObject({
      nameEn: '  Cold compress ',
      nameBn: '  Cold compress ',
      nameKeyEn: key,
      provisional: true,
      state: 'published',
      createdByAccountId: null,
    });
    expect((await repo.findOpenProvisional(tx, 'treatment', key))?.id).toBe(id);
    expect(await repo.findOpenProvisional(tx, 'medicine', key)).toBeNull();
  });

  it('keeps one row when two connections insert one open key; the loser gets null and continues', async () => {
    const key = `race-${uniqueSuffix()}`;
    const attempt = () =>
      testDb.transaction(async (t) => {
        const appTx = appTxOf(t);
        const result = await repo.insertProvisional(appTx, {
          id: newId(),
          publicId: newPublicId(),
          kind: 'symptom',
          text: 'Night sweats',
          key,
        });
        const winner = await repo.findOpenProvisional(appTx, 'symptom', key);
        return { result, winnerId: winner?.id ?? null };
      });

    const outcomes = await Promise.all([attempt(), attempt()]);

    const rows = await testDb
      .select()
      .from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.kind, 'symptom'), eq(taxonomyTerms.nameKeyEn, key)));
    expect(rows).toHaveLength(1);
    expect(outcomes.filter((o) => o.result === null)).toHaveLength(1);
    expect(outcomes.map((o) => o.winnerId)).toEqual([rows[0]!.id, rows[0]!.id]);
  });

  it('writes an alias with community provenance, once per key', async () => {
    const term = await buildTerm(testDb);
    const alias = { termId: term.id, alias: 'Sugar', aliasKey: 'sugar', lang: 'en' as const };

    await repo.insertAlias(tx, alias);
    await repo.insertAlias(tx, alias);

    const rows = await testDb
      .select()
      .from(taxonomyAliases)
      .where(eq(taxonomyAliases.termId, term.id));
    expect(rows.map((r) => [r.alias, r.provenance])).toEqual([['Sugar', 'community']]);
  });
});
