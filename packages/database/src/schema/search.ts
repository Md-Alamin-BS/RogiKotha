// Search (02-data-model.md §13, AD-8). Not in scope for this task: the
// search SQL itself (T-205) — only the table, generated `tsvector` column
// and indexes.
import { sql } from 'drizzle-orm';
import { customType, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, boolean } from 'drizzle-orm/pg-core';

import { createdAt, id } from './_common';
import { provenanceEnum, searchKindEnum } from './enums';
import { taxonomyTerms } from './taxonomy';

/** Drizzle has no built-in `tsvector` mapping. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const searchDocuments = pgTable(
  'search_documents',
  {
    id: id(),
    kind: searchKindEnum('kind').notNull(),
    refId: uuid('ref_id').notNull(),
    publicId: text('public_id').notNull(),
    titleEn: text('title_en'),
    titleBn: text('title_bn'),
    bodyEn: text('body_en'),
    bodyBn: text('body_bn'),
    // NFC, lowercased, de-spaced concatenation of names + aliases
    // (01-conventions.md §4).
    keyNfc: text('key_nfc').notNull(),
    tsv: tsvector('tsv').generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(title_en,'') || ' ' || coalesce(title_bn,'') || ' ' || coalesce(body_en,'') || ' ' || coalesce(body_bn,''))`,
    ),
    published: boolean('published').notNull().default(false),
    accountsCount: integer('accounts_count').notNull().default(0),
    recentAt: timestamp('recent_at', { withTimezone: true }),
    cityKey: text('city_key'),
    specialtyId: uuid('specialty_id').references(() => taxonomyTerms.id),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('search_documents_kind_ref_id_unique').on(t.kind, t.refId),
    index('search_documents_tsv_idx').using('gin', t.tsv),
    index('search_documents_key_nfc_trgm_idx').using('gin', t.keyNfc.op('gin_trgm_ops')),
  ],
);

export const searchAliases = pgTable(
  'search_aliases',
  {
    id: id(),
    kind: searchKindEnum('kind').notNull(),
    refId: uuid('ref_id').notNull(),
    alias: text('alias').notNull(),
    aliasKey: text('alias_key').notNull(),
    lang: text('lang', { enum: ['en', 'bn', 'banglish'] as const }).notNull(),
    provenance: provenanceEnum('provenance').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('search_aliases_alias_key_trgm_idx').using('gin', t.aliasKey.op('gin_trgm_ops'))],
);
