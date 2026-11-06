// Directory (02-data-model.md §4).
import type { Provenance } from '@rogikotha/contracts';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { accountProfiles } from './account';
import { createdAt, id, publicId, timestamps, wherePresent } from './_common';
import { facilityTypeEnum, provenanceEnum, publicationStateEnum } from './enums';
import { taxonomyTerms } from './taxonomy';

type FieldProvenance = Record<string, { source: Provenance; updatedAt: string }>;

export const doctors = pgTable(
  'doctors',
  {
    id: id(),
    publicId: publicId(),
    // Old prototype id (`d1`) — seed-only, never a routable id.
    seedRef: text('seed_ref'),
    nameEn: text('name_en').notNull(),
    nameBn: text('name_bn').notNull(),
    specialtyId: uuid('specialty_id').references(() => taxonomyTerms.id),
    qualificationsEn: text('qualifications_en'),
    qualificationsBn: text('qualifications_bn'),
    bmdcNumber: text('bmdc_number'),
    gender: text('gender'),
    languagesEn: text('languages_en'),
    languagesBn: text('languages_bn'),
    feeDisplayEn: text('fee_display_en'),
    feeDisplayBn: text('fee_display_bn'),
    cityEn: text('city_en'),
    cityBn: text('city_bn'),
    areaEn: text('area_en'),
    areaBn: text('area_bn'),
    aboutEn: text('about_en'),
    aboutBn: text('about_bn'),
    fieldProvenance: jsonb('field_provenance').$type<FieldProvenance>().notNull().default({}),
    avatarHue: smallint('avatar_hue'),
    claimedByAccountId: uuid('claimed_by_account_id').references(() => accountProfiles.id),
    state: publicationStateEnum('state').notNull(),
    mergedIntoId: uuid('merged_into_id').references((): AnyPgColumn => doctors.id),
    nameKey: text('name_key').notNull(),
    bmdcKey: text('bmdc_key'),
    ...timestamps(),
  },
  (t) => [uniqueIndex('doctors_seed_ref_unique').on(t.seedRef).where(wherePresent(t.seedRef))],
);

export const doctorChambers = pgTable('doctor_chambers', {
  id: id(),
  doctorId: uuid('doctor_id')
    .notNull()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references((): AnyPgColumn => facilityBranches.id),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  hoursEn: text('hours_en'),
  hoursBn: text('hours_bn'),
  provenance: provenanceEnum('provenance').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

export const facilities = pgTable(
  'facilities',
  {
    id: id(),
    publicId: publicId(),
    seedRef: text('seed_ref'),
    nameEn: text('name_en').notNull(),
    nameBn: text('name_bn').notNull(),
    type: facilityTypeEnum('type').notNull(),
    fieldProvenance: jsonb('field_provenance').$type<FieldProvenance>().notNull().default({}),
    avatarHue: smallint('avatar_hue'),
    state: publicationStateEnum('state').notNull(),
    claimedByAccountId: uuid('claimed_by_account_id').references(() => accountProfiles.id),
    ...timestamps(),
  },
  (t) => [uniqueIndex('facilities_seed_ref_unique').on(t.seedRef).where(wherePresent(t.seedRef))],
);

export const facilityBranches = pgTable(
  'facility_branches',
  {
    id: id(),
    publicId: publicId(),
    seedRef: text('seed_ref'),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    nameEn: text('name_en').notNull(),
    nameBn: text('name_bn').notNull(),
    cityEn: text('city_en').notNull(),
    cityBn: text('city_bn').notNull(),
    areaEn: text('area_en'),
    areaBn: text('area_bn'),
    addressEn: text('address_en'),
    addressBn: text('address_bn'),
    fieldProvenance: jsonb('field_provenance').$type<FieldProvenance>().notNull().default({}),
    state: publicationStateEnum('state').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    // FD-108: the branch's own name, filled only when `name_*` holds a branch label; and its hue.
    ownNameEn: text('own_name_en'),
    ownNameBn: text('own_name_bn'),
    avatarHue: smallint('avatar_hue'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('facility_branches_seed_ref_unique').on(t.seedRef).where(wherePresent(t.seedRef)),
    check(
      'facility_branches_own_name_both_or_neither',
      sql`(${t.ownNameEn} is null) = (${t.ownNameBn} is null)`,
    ),
    check('facility_branches_avatar_hue_check', sql`${t.avatarHue} between 0 and 359`),
  ],
);

export const profileSubmissions = pgTable('profile_submissions', {
  id: id(),
  kind: text('kind', { enum: ['doctor', 'facility'] as const }).notNull(),
  payload: jsonb('payload').notNull(),
  submittedByAccountId: uuid('submitted_by_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'merged'] as const,
  }).notNull(),
  duplicateOfId: uuid('duplicate_of_id'),
  reviewerNote: text('reviewer_note'),
  decidedBy: uuid('decided_by').references(() => accountProfiles.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdDoctorId: uuid('created_doctor_id').references(() => doctors.id),
  createdFacilityId: uuid('created_facility_id').references(() => facilities.id),
  createdAt: createdAt(),
});

export const profileClaims = pgTable('profile_claims', {
  id: id(),
  targetKind: text('target_kind', { enum: ['doctor', 'facility'] as const }).notNull(),
  targetId: uuid('target_id').notNull(),
  claimantAccountId: uuid('claimant_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  method: text('method').notNull(),
  // Private — never projected publicly (02-data-model.md §4).
  evidenceNote: text('evidence_note'),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'merged'] as const,
  }).notNull(),
  decidedBy: uuid('decided_by').references(() => accountProfiles.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const profileFieldChanges = pgTable('profile_field_changes', {
  id: id(),
  targetKind: text('target_kind', { enum: ['doctor', 'facility'] as const }).notNull(),
  targetId: uuid('target_id').notNull(),
  field: text('field').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value').notNull(),
  proposedByAccountId: uuid('proposed_by_account_id')
    .notNull()
    .references(() => accountProfiles.id),
  provenance: provenanceEnum('provenance').notNull(),
  // Protected fields (name, bmdc_number) always pend, whoever proposes them.
  protected: boolean('protected').notNull().default(false),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'merged'] as const,
  }).notNull(),
  decidedBy: uuid('decided_by').references(() => accountProfiles.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  reason: text('reason'),
  createdAt: createdAt(),
});

export const profileMerges = pgTable('profile_merges', {
  id: id(),
  kind: text('kind', { enum: ['doctor', 'facility'] as const }).notNull(),
  sourceId: uuid('source_id').notNull(),
  targetId: uuid('target_id').notNull(),
  // Opaque actor string, matching the audit convention (`account:<id>`, `staff:<id>`).
  actor: text('actor').notNull(),
  reason: text('reason').notNull(),
  transferred: jsonb('transferred').notNull(),
  createdAt: createdAt(),
});

export const profileRedirects = pgTable('profile_redirects', {
  fromPublicId: text('from_public_id').primaryKey(),
  toKind: text('to_kind', { enum: ['doctor', 'facility'] as const }).notNull(),
  toPublicId: text('to_public_id').notNull(),
  mergeId: uuid('merge_id').references(() => profileMerges.id),
  createdAt: createdAt(),
});
