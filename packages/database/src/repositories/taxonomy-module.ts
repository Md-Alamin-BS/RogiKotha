// U46's Taxonomy repository (functional-spec § 8), in a file of its own so the T-201 stub in
// `taxonomy.ts` stays untouched (BR8.4, F9). Keys arrive already normalised by `normalizeAliasKey`
// (BR4.2): nothing here computes one. A term is active when published (BR1.6); a mapped term
// stands for its canonical target. `created_by_account_id` is never written (BR5.2).
import type {
  NewProvisionalTerm,
  NewTermAlias,
  TaxonomyRepository,
  TermMatchRecord,
  TermRecord,
  Tx,
} from '@rogikotha/application';
import type { Locale, TermKind } from '@rogikotha/contracts';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { taxonomyAliases, taxonomyTerms } from '../schema/taxonomy';
import { executorOf } from '../unit-of-work';
import { byName } from './directory-module';

const termColumns = {
  id: taxonomyTerms.id,
  publicId: taxonomyTerms.publicId,
  kind: taxonomyTerms.kind,
  nameEn: taxonomyTerms.nameEn,
  nameBn: taxonomyTerms.nameBn,
  provisional: taxonomyTerms.provisional,
  canonicalId: taxonomyTerms.canonicalId,
  state: taxonomyTerms.state,
};

type TermRow = {
  id: string;
  publicId: string;
  kind: TermKind;
  nameEn: string;
  nameBn: string;
  provisional: boolean;
  canonicalId: string | null;
  state: string;
};

function toTermRecord(row: TermRow): TermRecord {
  const { state, ...rest } = row;
  return { ...rest, published: state === 'published' };
}

function termName(locale: Locale) {
  return locale === 'bn' ? taxonomyTerms.nameBn : taxonomyTerms.nameEn;
}

const isOpenProvisional = and(
  eq(taxonomyTerms.provisional, true),
  isNull(taxonomyTerms.canonicalId),
);

export class PgTaxonomyModuleRepository implements TaxonomyRepository {
  async findTermByPublicId(tx: Tx, publicId: string): Promise<TermRecord | null> {
    const [row] = await executorOf(tx)
      .select(termColumns)
      .from(taxonomyTerms)
      .where(eq(taxonomyTerms.publicId, publicId))
      .limit(1);
    return row ? toTermRecord(row) : null;
  }

  async listTerms(
    tx: Tx,
    kind: TermKind,
    options: { canonicalOnly: boolean; locale: Locale },
  ): Promise<TermRecord[]> {
    const rows = await executorOf(tx)
      .select(termColumns)
      .from(taxonomyTerms)
      .where(
        and(
          eq(taxonomyTerms.kind, kind),
          eq(taxonomyTerms.state, 'published'),
          isNull(taxonomyTerms.canonicalId),
          options.canonicalOnly ? eq(taxonomyTerms.provisional, false) : undefined,
        ),
      )
      .orderBy(byName(termName(options.locale)), asc(taxonomyTerms.publicId));
    return rows.map(toTermRecord);
  }

  async aliasesOf(tx: Tx, termId: string): Promise<string[]> {
    const rows = await executorOf(tx)
      .select({ alias: taxonomyAliases.alias })
      .from(taxonomyAliases)
      .where(eq(taxonomyAliases.termId, termId))
      .orderBy(asc(taxonomyAliases.alias));
    return rows.map((r) => r.alias);
  }

  async findByKey(tx: Tx, key: string, kind?: TermKind): Promise<TermMatchRecord[]> {
    const db = executorOf(tx);
    const byNameKey = or(eq(taxonomyTerms.nameKeyEn, key), eq(taxonomyTerms.nameKeyBn, key));
    const rows = await db
      .select({
        ...termColumns,
        byName: sql<boolean>`(${byNameKey})`.mapWith(Boolean),
        matchedAlias: sql<
          string | null
        >`(select a.alias from taxonomy_aliases a where a.term_id = "taxonomy_terms"."id" and a.alias_key = ${key} order by a.alias limit 1)`,
      })
      .from(taxonomyTerms)
      .where(
        and(
          eq(taxonomyTerms.state, 'published'),
          kind === undefined ? undefined : eq(taxonomyTerms.kind, kind),
          or(
            byNameKey,
            sql`exists (select 1 from taxonomy_aliases a where a.term_id = "taxonomy_terms"."id" and a.alias_key = ${key})`,
          ),
        ),
      )
      .orderBy(asc(taxonomyTerms.createdAt), asc(taxonomyTerms.id));

    const targetIds = [...new Set(rows.flatMap((r) => (r.canonicalId ? [r.canonicalId] : [])))];
    const targets = targetIds.length
      ? await db
          .select(termColumns)
          .from(taxonomyTerms)
          .where(and(inArray(taxonomyTerms.id, targetIds), eq(taxonomyTerms.state, 'published')))
      : [];
    const targetById = new Map(targets.map((t) => [t.id, toTermRecord(t)]));

    const matches = new Map<string, TermMatchRecord>();
    for (const { byName: nameMatched, matchedAlias, ...row } of rows) {
      // A mapped term stands for its canonical target; a hidden target matches nothing (BR1.6).
      const effective = row.canonicalId ? targetById.get(row.canonicalId) : toTermRecord(row);
      if (!effective || matches.has(effective.id)) continue;
      matches.set(effective.id, {
        term: effective,
        matchedAlias: nameMatched ? null : (matchedAlias ?? null),
      });
    }
    return [...matches.values()];
  }

  async listSuggested(tx: Tx, kind: TermKind, locale: Locale): Promise<TermRecord[]> {
    const rows = await executorOf(tx)
      .select(termColumns)
      .from(taxonomyTerms)
      .where(
        and(
          eq(taxonomyTerms.kind, kind),
          eq(taxonomyTerms.suggested, true),
          eq(taxonomyTerms.state, 'published'),
          isNull(taxonomyTerms.canonicalId),
        ),
      )
      .orderBy(
        sql`${taxonomyTerms.suggestedOrder} asc nulls last`,
        byName(termName(locale)),
        asc(taxonomyTerms.publicId),
      );
    return rows.map(toTermRecord);
  }

  async listPublished(tx: Tx, kind: TermKind, locale: Locale): Promise<TermRecord[]> {
    const rows = await executorOf(tx)
      .select(termColumns)
      .from(taxonomyTerms)
      .where(
        and(
          eq(taxonomyTerms.kind, kind),
          eq(taxonomyTerms.state, 'published'),
          isNull(taxonomyTerms.canonicalId),
        ),
      )
      .orderBy(byName(termName(locale)), asc(taxonomyTerms.publicId));
    return rows.map(toTermRecord);
  }

  async insertProvisional(tx: Tx, term: NewProvisionalTerm): Promise<{ termId: string } | null> {
    // A concurrent insert of the same open key waits, then does nothing; the caller's transaction
    // continues and reads the winner through `findOpenProvisional` (BR5.2).
    const [row] = await executorOf(tx)
      .insert(taxonomyTerms)
      .values({
        id: term.id,
        publicId: term.publicId,
        kind: term.kind,
        nameEn: term.text,
        nameBn: term.text,
        nameKeyEn: term.key,
        nameKeyBn: term.key,
        provisional: true,
        state: 'published',
      })
      .onConflictDoNothing()
      .returning({ termId: taxonomyTerms.id });
    return row ?? null;
  }

  async findOpenProvisional(tx: Tx, kind: TermKind, key: string): Promise<TermRecord | null> {
    const [row] = await executorOf(tx)
      .select(termColumns)
      .from(taxonomyTerms)
      .where(and(isOpenProvisional, eq(taxonomyTerms.kind, kind), eq(taxonomyTerms.nameKeyEn, key)))
      .limit(1);
    return row ? toTermRecord(row) : null;
  }

  async insertAlias(tx: Tx, alias: NewTermAlias): Promise<void> {
    await executorOf(tx)
      .insert(taxonomyAliases)
      .values({
        termId: alias.termId,
        alias: alias.alias,
        aliasKey: alias.aliasKey,
        lang: alias.lang,
        provenance: 'community',
      })
      .onConflictDoNothing();
  }
}
