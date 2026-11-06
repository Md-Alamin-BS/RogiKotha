// Taxonomy (02-data-model.md §5).
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { boolean, check, pgTable, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id, publicId, wherePresent } from './_common';
import { provenanceEnum, publicationStateEnum, termKindEnum } from './enums';

export const taxonomyTerms = pgTable(
  'taxonomy_terms',
  {
    id: id(),
    publicId: publicId(),
    seedRef: text('seed_ref'),
    kind: termKindEnum('kind').notNull(),
    nameEn: text('name_en').notNull(),
    nameBn: text('name_bn').notNull(),
    nameKeyEn: text('name_key_en').notNull(),
    nameKeyBn: text('name_key_bn').notNull(),
    provisional: boolean('provisional').notNull().default(false),
    canonicalId: uuid('canonical_id').references((): AnyPgColumn => taxonomyTerms.id),
    createdByAccountId: uuid('created_by_account_id').references(() => accountProfiles.id),
    state: publicationStateEnum('state').notNull(),
    // U46 (ISS-157, BR4.5): the composer's suggestion chips, in `suggested_order`.
    suggested: boolean('suggested').notNull().default(false),
    suggestedOrder: smallint('suggested_order'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('taxonomy_terms_seed_ref_unique').on(t.seedRef).where(wherePresent(t.seedRef)),
    // U46 BR5.2: one open provisional term per kind and wording, so a race inserts once.
    uniqueIndex('taxonomy_terms_open_provisional_key_unique')
      .on(t.kind, t.nameKeyEn)
      .where(sql`${t.provisional} and ${t.canonicalId} is null`),
    check('taxonomy_terms_suggested_order_check', sql`${t.suggestedOrder} >= 0`),
  ],
);

export const taxonomyAliases = pgTable(
  'taxonomy_aliases',
  {
    id: id(),
    termId: uuid('term_id')
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    aliasKey: text('alias_key').notNull(),
    lang: text('lang', { enum: ['en', 'bn', 'banglish'] as const }).notNull(),
    provenance: provenanceEnum('provenance').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('taxonomy_aliases_term_alias_key_unique').on(t.termId, t.aliasKey)],
);
