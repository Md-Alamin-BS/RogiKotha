// Hospital, clinic and diagnostic-centre pages of the demo slice (FD-101). Facility visits are read
// on their own: nothing here joins them to a doctor's experiences or counts (PRODUCT.md hard rule).
import {
  CRITERIA,
  type Criterion,
  type CriterionValue,
  type DemoDoctorRef,
  type DemoFacilityDetail,
  type DemoFacilityRow,
  type DemoFacilityVisit,
  type Locale,
  PUBLIC_ID_RE,
} from '@rogikotha/contracts';
import { and, asc, desc, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../client';
import { doctorChambers, doctors, facilities, facilityBranches } from '../schema/directory';
import { personas } from '../schema/identity';
import { facilityReviews } from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';

function present(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

function pick(locale: Locale, en: string | null, bn: string | null): string | null {
  return present(locale === 'bn' ? bn : en);
}

const isPublishedVisit = and(
  eq(facilityReviews.state, 'published'),
  isNull(facilityReviews.deletedAt),
  isNotNull(facilityReviews.publishedAt),
);

const isPublishedBranch = and(
  eq(facilityBranches.state, 'published'),
  eq(facilities.state, 'published'),
);

function selectBranchRows(db: Db, where: SQL | undefined) {
  const visitCount =
    sql<number>`(select count(*) from ${facilityReviews} where ${facilityReviews.branchId} = ${facilityBranches.id} and ${isPublishedVisit})`.mapWith(
      Number,
    );
  return db
    .select({
      id: facilityBranches.id,
      facilityId: facilities.id,
      publicId: facilityBranches.publicId,
      facilityEn: facilities.nameEn,
      facilityBn: facilities.nameBn,
      branchEn: facilityBranches.nameEn,
      branchBn: facilityBranches.nameBn,
      type: facilities.type,
      cityEn: facilityBranches.cityEn,
      cityBn: facilityBranches.cityBn,
      areaEn: facilityBranches.areaEn,
      areaBn: facilityBranches.areaBn,
      addressEn: facilityBranches.addressEn,
      addressBn: facilityBranches.addressBn,
      visitCount,
    })
    .from(facilityBranches)
    .innerJoin(facilities, eq(facilities.id, facilityBranches.facilityId))
    .where(and(isPublishedBranch, where));
}

type BranchRow = Awaited<ReturnType<typeof selectBranchRows>>[number];

function toRow(row: BranchRow, locale: Locale): DemoFacilityRow {
  const facilityName = locale === 'bn' ? row.facilityBn : row.facilityEn;
  const branchName = locale === 'bn' ? row.branchBn : row.branchEn;
  return {
    publicId: row.publicId,
    facilityName,
    branchName: branchName === facilityName ? null : present(branchName),
    type: row.type,
    city: pick(locale, row.cityEn, row.cityBn),
    area: pick(locale, row.areaEn, row.areaBn),
    visitCount: row.visitCount,
  };
}

/** Every published branch, alphabetical by facility then branch name: never ranked. */
export async function listFacilities(db: Db, locale: Locale): Promise<DemoFacilityRow[]> {
  const facilityName = locale === 'bn' ? facilities.nameBn : facilities.nameEn;
  const branchName = locale === 'bn' ? facilityBranches.nameBn : facilityBranches.nameEn;
  const rows = await selectBranchRows(db, undefined).orderBy(
    asc(facilityName),
    asc(branchName),
    asc(facilityBranches.id),
  );
  return rows.map((row) => toRow(row, locale));
}

function answered(criteria: Partial<Record<Criterion, CriterionValue | null>>) {
  return CRITERIA.flatMap((criterion) => {
    const value = criteria[criterion];
    return value ? [{ criterion, value }] : [];
  });
}

/** One published branch by public id, with its visits, doctors and sibling branches. */
export async function getFacility(
  db: Db,
  publicId: string,
  locale: Locale,
): Promise<DemoFacilityDetail | null> {
  if (!PUBLIC_ID_RE.test(publicId)) return null;
  const [row] = await selectBranchRows(db, eq(facilityBranches.publicId, publicId)).limit(1);
  if (!row) return null;

  const visitRows = await db
    .select({
      publicId: facilityReviews.publicId,
      displayName: personas.displayName,
      identityMode: facilityReviews.identityMode,
      periodYear: facilityReviews.periodYear,
      periodMonth: facilityReviews.periodMonth,
      body: facilityReviews.body,
      criteria: facilityReviews.criteria,
    })
    .from(facilityReviews)
    .innerJoin(personas, eq(personas.id, facilityReviews.authorPersonaId))
    .where(and(eq(facilityReviews.branchId, row.id), isPublishedVisit))
    .orderBy(desc(facilityReviews.publishedAt), desc(facilityReviews.id));
  const visits: DemoFacilityVisit[] = visitRows.map((v) => ({
    publicId: v.publicId,
    authorDisplayName: v.identityMode === 'anonymous' ? null : v.displayName,
    identityMode: v.identityMode,
    periodYear: v.periodYear,
    periodMonth: v.periodMonth,
    body: v.body,
    criteria: answered(v.criteria),
  }));

  const name = locale === 'bn' ? doctors.nameBn : doctors.nameEn;
  const doctorRows = await db
    .selectDistinct({
      id: doctors.id,
      publicId: doctors.publicId,
      name,
      specialtyEn: taxonomyTerms.nameEn,
      specialtyBn: taxonomyTerms.nameBn,
    })
    .from(doctorChambers)
    .innerJoin(doctors, eq(doctors.id, doctorChambers.doctorId))
    .leftJoin(taxonomyTerms, eq(taxonomyTerms.id, doctors.specialtyId))
    .where(
      and(
        eq(doctorChambers.branchId, row.id),
        eq(doctors.state, 'published'),
        isNull(doctors.mergedIntoId),
      ),
    )
    .orderBy(asc(name), asc(doctors.id));
  const doctorRefs: DemoDoctorRef[] = doctorRows.map((d) => ({
    id: d.id,
    publicId: d.publicId,
    name: d.name,
    specialty: pick(locale, d.specialtyEn, d.specialtyBn),
  }));

  const branchName = locale === 'bn' ? facilityBranches.nameBn : facilityBranches.nameEn;
  const siblingRows = await selectBranchRows(
    db,
    and(eq(facilityBranches.facilityId, row.facilityId), sql`${facilityBranches.id} <> ${row.id}`),
  ).orderBy(asc(branchName), asc(facilityBranches.id));

  return {
    ...toRow(row, locale),
    address: pick(locale, row.addressEn, row.addressBn),
    visits,
    doctors: doctorRefs,
    siblings: siblingRows.map((s) => toRow(s, locale)),
  };
}
