// Builders for U46's repository tests. Every row is synthetic and carries a per-call suffix, so
// tests never collide with each other or with a seeded corpus. Keys are written as plain lower-case
// text here because the database package never computes a taxonomy key (BR4.2).
import {
  newId,
  newPublicId,
  type Criterion,
  type CriterionValue,
  type FacilityType,
  type IdentityMode,
  type PublicationState,
  type Sentiment,
  type TagGroup,
  type TermKind,
} from '@rogikotha/contracts';

import type { Db } from '../client';
import {
  doctorChambers,
  doctors,
  facilities,
  facilityBranches,
  profileSubmissions,
} from '../schema/directory';
import { personas } from '../schema/identity';
import { facilityReviews, reviews, reviewTags } from '../schema/review';
import { taxonomyAliases, taxonomyTerms } from '../schema/taxonomy';
import { uniqueSuffix } from './account-test-support';

export { buildAccount, uniqueSuffix } from './account-test-support';

export interface BuiltTerm {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
}

export async function buildTerm(
  db: Db,
  overrides: {
    kind?: TermKind;
    nameEn?: string;
    nameBn?: string;
    state?: PublicationState;
    canonicalId?: string | null;
    provisional?: boolean;
    suggested?: boolean;
    suggestedOrder?: number | null;
    nameKeyEn?: string;
  } = {},
): Promise<BuiltTerm> {
  const suffix = uniqueSuffix();
  const nameEn = overrides.nameEn ?? `Synthetic condition ${suffix}`;
  const nameBn = overrides.nameBn ?? `কাল্পনিক রোগ ${suffix}`;
  const [row] = await db
    .insert(taxonomyTerms)
    .values({
      publicId: newPublicId(),
      kind: overrides.kind ?? 'condition',
      nameEn,
      nameBn,
      nameKeyEn: overrides.nameKeyEn ?? `key-en-${suffix}`,
      nameKeyBn: `key-bn-${suffix}`,
      provisional: overrides.provisional ?? false,
      canonicalId: overrides.canonicalId ?? null,
      state: overrides.state ?? 'published',
      suggested: overrides.suggested ?? false,
      suggestedOrder: overrides.suggestedOrder ?? null,
    })
    .returning({ id: taxonomyTerms.id, publicId: taxonomyTerms.publicId });
  return { ...row!, nameEn, nameBn };
}

export async function buildAlias(db: Db, termId: string, alias: string, aliasKey = alias) {
  await db.insert(taxonomyAliases).values({
    termId,
    alias,
    aliasKey,
    lang: 'en',
    provenance: 'community',
  });
}

export interface BuiltDoctor {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
}

export async function buildDoctor(
  db: Db,
  overrides: {
    nameEn?: string;
    nameBn?: string;
    state?: PublicationState;
    mergedIntoId?: string | null;
    specialtyId?: string | null;
    createdAt?: Date;
  } = {},
): Promise<BuiltDoctor> {
  const suffix = uniqueSuffix();
  const nameEn = overrides.nameEn ?? `Dr. Synthetic Doctor ${suffix}`;
  const nameBn = overrides.nameBn ?? `ডা. কাল্পনিক ডাক্তার ${suffix}`;
  const [row] = await db
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn,
      nameBn,
      specialtyId: overrides.specialtyId ?? null,
      qualificationsEn: 'MBBS, FCPS',
      qualificationsBn: 'এমবিবিএস, এফসিপিএস',
      cityEn: 'Dhaka',
      cityBn: 'ঢাকা',
      areaEn: 'Mirpur',
      areaBn: 'মিরপুর',
      avatarHue: 210,
      state: overrides.state ?? 'published',
      mergedIntoId: overrides.mergedIntoId ?? null,
      nameKey: `key-${suffix}`,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .returning({ id: doctors.id, publicId: doctors.publicId });
  return { ...row!, nameEn, nameBn };
}

export interface BuiltBranch {
  id: string;
  publicId: string;
  facilityId: string;
}

export async function buildFacility(
  db: Db,
  overrides: {
    nameEn?: string;
    nameBn?: string;
    state?: PublicationState;
    type?: FacilityType;
  } = {},
): Promise<{ id: string }> {
  const suffix = uniqueSuffix();
  const [row] = await db
    .insert(facilities)
    .values({
      publicId: newPublicId(),
      nameEn: overrides.nameEn ?? `Synthetic Care Hospital ${suffix}`,
      nameBn: overrides.nameBn ?? `কাল্পনিক কেয়ার হাসপাতাল ${suffix}`,
      type: overrides.type ?? 'hospital',
      state: overrides.state ?? 'published',
    })
    .returning({ id: facilities.id });
  return row!;
}

export async function buildBranch(
  db: Db,
  facilityId: string,
  overrides: {
    nameEn?: string;
    nameBn?: string;
    ownNameEn?: string | null;
    ownNameBn?: string | null;
    avatarHue?: number | null;
    state?: PublicationState;
  } = {},
): Promise<BuiltBranch> {
  const [row] = await db
    .insert(facilityBranches)
    .values({
      publicId: newPublicId(),
      facilityId,
      nameEn: overrides.nameEn ?? 'Mirpur branch',
      nameBn: overrides.nameBn ?? 'মিরপুর শাখা',
      ownNameEn: overrides.ownNameEn ?? null,
      ownNameBn: overrides.ownNameBn ?? null,
      avatarHue: overrides.avatarHue === undefined ? 180 : overrides.avatarHue,
      cityEn: 'Dhaka',
      cityBn: 'ঢাকা',
      state: overrides.state ?? 'published',
    })
    .returning({ id: facilityBranches.id, publicId: facilityBranches.publicId });
  return { ...row!, facilityId };
}

export async function buildChamber(
  db: Db,
  doctorId: string,
  branchId: string | null,
  sortOrder = 0,
  nameEn = `Synthetic Clinic ${uniqueSuffix()}`,
) {
  await db.insert(doctorChambers).values({
    doctorId,
    branchId,
    nameEn,
    nameBn: `কাল্পনিক ক্লিনিক ${sortOrder}`,
    hoursEn: 'Sat–Wed, 6–9 pm',
    hoursBn: 'শনি–বুধ, সন্ধ্যা ৬–৯টা',
    provenance: 'community',
    sortOrder,
  });
}

export async function buildPersona(
  db: Db,
  overrides: { kind?: IdentityMode; displayName?: string; username?: string | null } = {},
): Promise<string> {
  const [row] = await db
    .insert(personas)
    .values({
      kind: overrides.kind ?? 'named',
      displayName: overrides.displayName ?? 'Rina Akter',
      username: overrides.username ?? null,
    })
    .returning({ id: personas.id });
  return row!.id;
}

export interface TagSpec {
  group: TagGroup;
  termId?: string;
  freeText?: string;
  notSure?: boolean;
}

export async function buildReview(
  db: Db,
  doctorId: string,
  personaId: string,
  overrides: {
    state?: PublicationState;
    publishedAt?: Date | null;
    deletedAt?: Date | null;
    branchId?: string | null;
    sentiment?: Sentiment | null;
    identityMode?: IdentityMode;
    tags?: TagSpec[];
  } = {},
): Promise<{ id: string; publicId: string }> {
  const [row] = await db
    .insert(reviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId: personaId,
      doctorId,
      branchId: overrides.branchId ?? null,
      kind: 'quick',
      relationship: 'self',
      identityMode: overrides.identityMode ?? 'named',
      sentiment: overrides.sentiment === undefined ? 'positive' : overrides.sentiment,
      outcome: 'helped',
      periodYear: 2026,
      periodMonth: 3,
      title: `A careful visit ${uniqueSuffix()}`,
      body: 'Waited two hours, then a careful exam and a clear plan.',
      language: 'en',
      state: overrides.state ?? 'published',
      publishedAt: overrides.publishedAt === undefined ? new Date() : overrides.publishedAt,
      deletedAt: overrides.deletedAt ?? null,
    })
    .returning({ id: reviews.id, publicId: reviews.publicId });
  let at = Date.now();
  for (const tag of overrides.tags ?? []) {
    at += 1000;
    await db.insert(reviewTags).values({
      id: newId(),
      reviewId: row!.id,
      group: tag.group,
      termId: tag.termId ?? null,
      freeText: tag.freeText ?? null,
      notSure: tag.notSure ?? false,
      createdAt: new Date(at),
    });
  }
  return row!;
}

export async function buildFacilityReview(
  db: Db,
  branchId: string,
  personaId: string,
  overrides: {
    state?: PublicationState;
    deletedAt?: Date | null;
    publishedAt?: Date | null;
    criteria?: Partial<Record<Criterion, CriterionValue | null>>;
  } = {},
): Promise<{ publicId: string }> {
  const [row] = await db
    .insert(facilityReviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId: personaId,
      branchId,
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 2,
      body: 'The reception was calm and the queue moved quickly.',
      criteria: overrides.criteria ?? { staff: 'good', overall: 'mixed' },
      state: overrides.state ?? 'published',
      publishedAt: overrides.publishedAt === undefined ? new Date() : overrides.publishedAt,
      deletedAt: overrides.deletedAt ?? null,
    })
    .returning({ publicId: facilityReviews.publicId });
  return row!;
}

export async function buildSubmission(
  db: Db,
  doctorId: string,
  accountId: string,
  overrides: {
    kind?: 'doctor' | 'facility';
    status?: 'pending' | 'approved' | 'rejected' | 'merged';
  } = {},
) {
  await db.insert(profileSubmissions).values({
    kind: overrides.kind ?? 'doctor',
    payload: { nameEn: 'synthetic' },
    submittedByAccountId: accountId,
    status: overrides.status ?? 'pending',
    createdDoctorId: doctorId,
  });
}
