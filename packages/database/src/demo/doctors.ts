// Doctor directory data functions of the demo slice (FR3, FR7). Signatures fixed by the foundation
// step; bodies written by the home and doctors step (plan Step 7).
import type {
  DemoDoctorChamber,
  DemoDoctorDetail,
  DemoDoctorListRow,
  DemoDoctorOption,
  DemoReviewCard,
  Locale,
} from '@rogikotha/contracts';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../client';
import { comments } from '../schema/community';
import { doctorChambers, doctors } from '../schema/directory';
import { evidenceItems } from '../schema/evidence';
import { personas } from '../schema/identity';
import { reviews, reviewVersions, type ReviewSections } from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';
import { DEMO_READY_EVIDENCE_STATES } from './evidence';

/** The prototype's `accountRow()` cuts the body at 190 characters. */
export const EXCERPT_LENGTH = 190;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Text that is null, empty or only whitespace counts as not provided. */
function present(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

// ASSUMPTION(demo-slice): no fallback to the other language when the active one is missing; the
// field then reads "Not provided", so a Bengali page never shows English facts unannounced.
function pick(locale: Locale, en: string | null, bn: string | null): string | null {
  return present(locale === 'bn' ? bn : en);
}

const isPublishedDoctor = and(eq(doctors.state, 'published'), isNull(doctors.mergedIntoId));

const isPublishedReview = and(
  eq(reviews.state, 'published'),
  isNull(reviews.deletedAt),
  isNotNull(reviews.publishedAt),
);

function doctorName(locale: Locale) {
  return locale === 'bn' ? doctors.nameBn : doctors.nameEn;
}

function publishedCounts(db: Db) {
  return db
    .select({ doctorId: reviews.doctorId, n: count().as('n') })
    .from(reviews)
    .where(isPublishedReview)
    .groupBy(reviews.doctorId)
    .as('published_counts');
}

function selectDoctorRows(db: Db, where: SQL | undefined) {
  const counts = publishedCounts(db);
  const reviewCount = sql<number>`coalesce(${counts.n}, 0)`.mapWith(Number);
  const query = db
    .select({
      id: doctors.id,
      publicId: doctors.publicId,
      nameEn: doctors.nameEn,
      nameBn: doctors.nameBn,
      specialtyEn: taxonomyTerms.nameEn,
      specialtyBn: taxonomyTerms.nameBn,
      qualificationsEn: doctors.qualificationsEn,
      qualificationsBn: doctors.qualificationsBn,
      cityEn: doctors.cityEn,
      cityBn: doctors.cityBn,
      areaEn: doctors.areaEn,
      areaBn: doctors.areaBn,
      aboutEn: doctors.aboutEn,
      aboutBn: doctors.aboutBn,
      languagesEn: doctors.languagesEn,
      languagesBn: doctors.languagesBn,
      feeDisplayEn: doctors.feeDisplayEn,
      feeDisplayBn: doctors.feeDisplayBn,
      avatarHue: doctors.avatarHue,
      publishedReviewCount: reviewCount,
    })
    .from(doctors)
    .leftJoin(taxonomyTerms, eq(taxonomyTerms.id, doctors.specialtyId))
    .leftJoin(counts, eq(counts.doctorId, doctors.id))
    .where(and(isPublishedDoctor, where));
  return { query, reviewCount };
}

type DoctorRow = Awaited<ReturnType<typeof selectDoctorRows>['query']>[number];

function toListRow(row: DoctorRow, locale: Locale): DemoDoctorListRow {
  return {
    id: row.id,
    publicId: row.publicId,
    name: locale === 'bn' ? row.nameBn : row.nameEn,
    specialty: pick(locale, row.specialtyEn, row.specialtyBn),
    qualifications: pick(locale, row.qualificationsEn, row.qualificationsBn),
    city: pick(locale, row.cityEn, row.cityBn),
    area: pick(locale, row.areaEn, row.areaBn),
    avatarHue: row.avatarHue,
    publishedReviewCount: row.publishedReviewCount,
  };
}

/**
 * Published doctors (`state = 'published'`, not merged) in a neutral order: most published
 * experiences first, then name in `locale`. Never ordered by sentiment or any quality signal.
 */
export async function listDoctors(db: Db, locale: Locale): Promise<DemoDoctorListRow[]> {
  const { query, reviewCount } = selectDoctorRows(db, undefined);
  const rows = await query.orderBy(desc(reviewCount), asc(doctorName(locale)), asc(doctors.id));
  return rows.map((row) => toListRow(row, locale));
}

function listChambers(db: Db, doctorId: string, locale: Locale): Promise<DemoDoctorChamber[]> {
  return db
    .select({
      nameEn: doctorChambers.nameEn,
      nameBn: doctorChambers.nameBn,
      hoursEn: doctorChambers.hoursEn,
      hoursBn: doctorChambers.hoursBn,
    })
    .from(doctorChambers)
    .where(eq(doctorChambers.doctorId, doctorId))
    .orderBy(asc(doctorChambers.sortOrder), asc(doctorChambers.createdAt), asc(doctorChambers.id))
    .then((rows) =>
      rows.map((c) => ({
        name: locale === 'bn' ? c.nameBn : c.nameEn,
        hours: pick(locale, c.hoursEn, c.hoursBn),
      })),
    );
}

/** One published doctor by uuid or by 10-char public id, with chambers; null when not found. */
export async function getDoctor(
  db: Db,
  doctorIdOrPublicId: string,
  locale: Locale,
): Promise<DemoDoctorDetail | null> {
  // A non-uuid string compared with the uuid column would be a Postgres cast error, not a miss.
  const match = UUID_RE.test(doctorIdOrPublicId)
    ? eq(doctors.id, doctorIdOrPublicId)
    : eq(doctors.publicId, doctorIdOrPublicId);
  const [row] = await selectDoctorRows(db, match).query.limit(1);
  if (!row) return null;

  return {
    ...toListRow(row, locale),
    about: pick(locale, row.aboutEn, row.aboutBn),
    languages: pick(locale, row.languagesEn, row.languagesBn),
    feeDisplay: pick(locale, row.feeDisplayEn, row.feeDisplayBn),
    chambers: await listChambers(db, row.id, locale),
  };
}

/** Plain-text excerpt: the quick body, else the first filled section of a detailed review. */
function buildExcerpt(body: string | null, sections: ReviewSections | null): string {
  const source =
    present(body) ??
    present(sections?.symptoms) ??
    present(sections?.diagnosis) ??
    present(sections?.treatment) ??
    present(sections?.after) ??
    '';
  const flat = source.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…` : flat;
}

function selectReviewCards(db: Db, locale: Locale, where: SQL | undefined) {
  return db
    .select({
      publicId: reviews.publicId,
      title: reviews.title,
      body: reviews.body,
      sections: reviews.sections,
      doctorId: doctors.id,
      doctorPublicId: doctors.publicId,
      doctorName: doctorName(locale),
      specialtyEn: taxonomyTerms.nameEn,
      specialtyBn: taxonomyTerms.nameBn,
      authorDisplayName: personas.displayName,
      identityMode: reviews.identityMode,
      relationship: reviews.relationship,
      sentiment: reviews.sentiment,
      outcome: reviews.outcome,
      periodYear: reviews.periodYear,
      periodMonth: reviews.periodMonth,
      publishedAt: reviews.publishedAt,
      edited: sql<boolean>`exists (select 1 from ${reviewVersions} where ${reviewVersions.reviewId} = ${reviews.id} and ${reviewVersions.changeKind} = 'correction')`,
      commentCount:
        sql<number>`(select count(*) from ${comments} where ${comments.reviewId} = ${reviews.id} and ${comments.state} = 'published' and ${comments.deletedAt} is null)`.mapWith(
          Number,
        ),
      readyEvidenceCount:
        sql<number>`(select count(*) from ${evidenceItems} where ${evidenceItems.reviewId} = ${reviews.id} and ${inArray(evidenceItems.state, DEMO_READY_EVIDENCE_STATES)})`.mapWith(
          Number,
        ),
    })
    .from(reviews)
    .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
    .innerJoin(personas, eq(personas.id, reviews.authorPersonaId))
    .leftJoin(taxonomyTerms, eq(taxonomyTerms.id, doctors.specialtyId))
    .where(and(isPublishedReview, isPublishedDoctor, where))
    .orderBy(desc(reviews.publishedAt), desc(reviews.id));
}

type ReviewCardRow = Awaited<ReturnType<typeof selectReviewCards>>[number];

function toReviewCard(row: ReviewCardRow, locale: Locale): DemoReviewCard {
  return {
    publicId: row.publicId,
    title: row.title,
    excerpt: buildExcerpt(row.body, row.sections ?? null),
    doctor: {
      id: row.doctorId,
      publicId: row.doctorPublicId,
      name: row.doctorName,
      specialty: pick(locale, row.specialtyEn, row.specialtyBn),
    },
    authorDisplayName: row.authorDisplayName,
    identityMode: row.identityMode,
    relationship: row.relationship,
    sentiment: row.sentiment,
    outcome: row.outcome,
    periodYear: row.periodYear,
    periodMonth: row.periodMonth,
    // isPublishedReview filters out a null publishedAt.
    publishedAt: row.publishedAt!,
    edited: Boolean(row.edited),
    commentCount: row.commentCount,
    readyEvidenceCount: row.readyEvidenceCount,
  };
}

/** Published experiences about one doctor (by uuid), most recent first. */
export async function listPublishedReviewsForDoctor(
  db: Db,
  doctorId: string,
  locale: Locale,
): Promise<DemoReviewCard[]> {
  if (!UUID_RE.test(doctorId)) return [];
  const rows = await selectReviewCards(db, locale, eq(reviews.doctorId, doctorId));
  return rows.map((row) => toReviewCard(row, locale));
}

/** The `limit` most recently published experiences, for the home page. */
export async function listRecentPublishedReviews(
  db: Db,
  limit: number,
  locale: Locale,
): Promise<DemoReviewCard[]> {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];
  const rows = await selectReviewCards(db, locale, undefined).limit(safeLimit);
  return rows.map((row) => toReviewCard(row, locale));
}

/** Every published doctor as a write-form choice, ordered by name in `locale`. */
export async function listDoctorOptions(db: Db, locale: Locale): Promise<DemoDoctorOption[]> {
  const rows = await db
    .select({
      id: doctors.id,
      publicId: doctors.publicId,
      name: doctorName(locale),
      specialtyEn: taxonomyTerms.nameEn,
      specialtyBn: taxonomyTerms.nameBn,
    })
    .from(doctors)
    .leftJoin(taxonomyTerms, eq(taxonomyTerms.id, doctors.specialtyId))
    .where(isPublishedDoctor)
    .orderBy(asc(doctorName(locale)), asc(doctors.id));
  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    name: row.name,
    specialty: pick(locale, row.specialtyEn, row.specialtyBn),
  }));
}
