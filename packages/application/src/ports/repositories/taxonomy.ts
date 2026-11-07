// The Taxonomy repository port (U46 functional-spec § 8). Keys arrive already normalised by
// `normalizeAliasKey` (BR4.2); nothing here reads a review-side table (BR6.2).
import type { Locale, TermKind } from '@rogikotha/contracts';

import type { Tx } from '../unit-of-work';

export interface TermRecord {
  id: string;
  publicId: string;
  kind: TermKind;
  nameEn: string;
  nameBn: string;
  provisional: boolean;
  /** Set when the term redirects to a canonical one (release 2 sets it). */
  canonicalId: string | null;
  /** Only published terms are active (BR1.6). */
  published: boolean;
}

export interface TermMatchRecord {
  /** The effective term: the canonical target when mapped, else the term itself (BR1.6). */
  term: TermRecord;
  /** The alias that matched, when the match was an alias rather than a name. */
  matchedAlias: string | null;
}

export interface NewProvisionalTerm {
  id: string;
  publicId: string;
  kind: TermKind;
  /** The author's wording, unchanged, in both name columns (AC5.3.2). */
  text: string;
  key: string;
}

export interface NewTermAlias {
  termId: string;
  alias: string;
  aliasKey: string;
  lang: 'en' | 'bn' | 'banglish';
}

export interface TaxonomyRepository {
  findTermByPublicId(tx: Tx, publicId: string): Promise<TermRecord | null>;
  /** Active terms of the kind by name in `locale`; `canonicalOnly` leaves out provisional ones. */
  listTerms(
    tx: Tx,
    kind: TermKind,
    options: { canonicalOnly: boolean; locale: Locale },
  ): Promise<TermRecord[]>;
  /** Aliases as written, by alias. */
  aliasesOf(tx: Tx, termId: string): Promise<string[]>;
  /** Active terms whose name or alias key equals `key`, as effective terms, distinct. */
  findByKey(tx: Tx, key: string, kind?: TermKind): Promise<TermMatchRecord[]>;
  /** Active canonical suggested terms of the kind, by suggested order, then name. */
  listSuggested(tx: Tx, kind: TermKind, locale: Locale): Promise<TermRecord[]>;
  /** U47 (Q19): active canonical terms of the kind, by name; the composer's specialty list. */
  listPublished(tx: Tx, kind: TermKind, locale: Locale): Promise<TermRecord[]>;
  /** Inserts unless an open provisional term holds the key; `null` when a race was lost. */
  insertProvisional(tx: Tx, term: NewProvisionalTerm): Promise<{ termId: string } | null>;
  /** The open provisional term of the kind holding the key, if any. */
  findOpenProvisional(tx: Tx, kind: TermKind, key: string): Promise<TermRecord | null>;
  insertAlias(tx: Tx, alias: NewTermAlias): Promise<void>;
}
