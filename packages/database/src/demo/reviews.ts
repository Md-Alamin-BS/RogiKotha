// Remaining demo-slice experience functions (FR4, FR6.1), each kept until the Unit that retires it:
//   getReviewByPublicId   - U48 (comments) and U49 (evidence), then U50.
//   getOwnReviewForEdit   - U22 no longer calls it; deleted at merge after a caller grep (Step 33).
// Publishing and correcting now run through the review module (U47, U22); the demo writers are gone.
import { type DemoReviewDetail, type DemoReviewEditRow, type Locale } from '@rogikotha/contracts';
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import type { Db, Tx } from '../client';
import { doctors } from '../schema/directory';
import { evidenceItems } from '../schema/evidence';
import { personaLinks, personas } from '../schema/identity';
import { reviews, reviewVersions } from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';
import { DEMO_READY_EVIDENCE_STATES } from './ready-evidence-states';

/** Personas of one account, as a subquery: ownership is "one of my personas wrote it". */
function personasOf(db: Db | Tx, accountId: string) {
  return db
    .select({ id: personaLinks.personaId })
    .from(personaLinks)
    .where(eq(personaLinks.accountId, accountId));
}

const isPublished = and(
  eq(reviews.state, 'published'),
  isNull(reviews.deletedAt),
  isNotNull(reviews.publishedAt),
);

/**
 * The public projection of a published, not deleted experience: doctor, persona display name,
 * dates, edited flag and the ready-evidence count. Null for anything else.
 */
export async function getReviewByPublicId(
  db: Db,
  publicId: string,
  locale: Locale,
): Promise<DemoReviewDetail | null> {
  const bn = locale === 'bn';
  const [row] = await db
    .select({
      id: reviews.id,
      publicId: reviews.publicId,
      title: reviews.title,
      body: reviews.body,
      doctorId: doctors.id,
      doctorPublicId: doctors.publicId,
      doctorName: bn ? doctors.nameBn : doctors.nameEn,
      doctorSpecialty: bn ? taxonomyTerms.nameBn : taxonomyTerms.nameEn,
      authorDisplayName: personas.displayName,
      identityMode: reviews.identityMode,
      relationship: reviews.relationship,
      sentiment: reviews.sentiment,
      outcome: reviews.outcome,
      periodYear: reviews.periodYear,
      periodMonth: reviews.periodMonth,
      language: reviews.language,
      publishedAt: reviews.publishedAt,
      updatedAt: reviews.updatedAt,
      version: reviews.version,
      edited: sql<boolean>`exists (
        select 1 from ${reviewVersions}
        where ${reviewVersions.reviewId} = ${reviews.id}
          and ${reviewVersions.changeKind} = 'correction'
      )`,
      readyEvidenceCount: sql<number>`(
        select count(*)::int from ${evidenceItems}
        where ${evidenceItems.reviewId} = ${reviews.id}
          and ${inArray(evidenceItems.state, DEMO_READY_EVIDENCE_STATES)}
      )`.mapWith(Number),
    })
    .from(reviews)
    .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
    .innerJoin(personas, eq(personas.id, reviews.authorPersonaId))
    .leftJoin(taxonomyTerms, eq(taxonomyTerms.id, doctors.specialtyId))
    .where(and(eq(reviews.publicId, publicId), isPublished))
    .limit(1);
  if (!row) return null;

  const { doctorId, doctorPublicId, doctorName, doctorSpecialty, publishedAt, ...rest } = row;
  return {
    ...rest,
    doctor: {
      id: doctorId,
      publicId: doctorPublicId,
      name: doctorName,
      specialty: doctorSpecialty,
    },
    publishedAt: publishedAt!,
  };
}

/**
 * The experience for the edit form, only when one of `accountId`'s personas wrote it; else null.
 * ASSUMPTION(demo-slice): only published, not deleted quick reviews are editable; a detailed
 * review keeps its sections in `sections`, which the quick form cannot edit.
 */
export async function getOwnReviewForEdit(
  db: Db,
  publicId: string,
  accountId: string,
): Promise<DemoReviewEditRow | null> {
  const [row] = await db
    .select({
      id: reviews.id,
      publicId: reviews.publicId,
      doctorId: reviews.doctorId,
      title: reviews.title,
      body: reviews.body,
      sentiment: reviews.sentiment,
      outcome: reviews.outcome,
      version: reviews.version,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.publicId, publicId),
        eq(reviews.kind, 'quick'),
        isPublished,
        inArray(reviews.authorPersonaId, personasOf(db, accountId)),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { ...row, body: row.body ?? '' };
}
