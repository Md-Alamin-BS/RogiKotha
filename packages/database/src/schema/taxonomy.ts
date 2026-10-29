// Taxonomy (02-data-model.md §5).
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { boolean, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('taxonomy_terms_seed_ref_unique').on(t.seedRef).where(wherePresent(t.seedRef)),
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
