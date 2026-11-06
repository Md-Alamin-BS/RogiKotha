// U46's Directory repository (functional-spec § 8), in a file of its own so the T-201 stub in
// `directory.ts` stays untouched (BR8.4, F9). A doctor is visible when published and not merged
// (BR1.1), a branch when it and its organisation are published (BR1.2). Nothing here reads a
// review-side table (BR6.2), and no private column reaches a returned record (BR2.10).
import type {
  BranchRecord,
  ChamberRecord,
  DirectoryRepository,
  DoctorRecord,
  DoctorRefRecord,
  DoctorWithChambersRecord,
  FieldProvenanceRecord,
  NameKeyCandidate,
  NewMemberDoctor,
  PageOfRows,
  PageRequest,
  Tx,
} from '@rogikotha/application';
import { DOCTOR_TITLE_PATTERN, type Locale } from '@rogikotha/contracts';
import { aliasedTable, and, asc, count, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import {
  doctorChambers,
  doctors,
  facilities,
  facilityBranches,
  profileSubmissions,
} from '../schema/directory';
import { taxonomyTerms } from '../schema/taxonomy';
import { executorOf } from '../unit-of-work';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Names sort by the ICU root collation, which the compose PostgreSQL 18 image ships (§ 15). */
export function byName(column: PgColumn | SQL): SQL {
  return sql`${column} collate "und-x-icu"`;
}

export const isVisibleDoctor = and(eq(doctors.state, 'published'), isNull(doctors.mergedIntoId))!;

export const isVisibleBranch = and(
  eq(facilityBranches.state, 'published'),
  eq(facilities.state, 'published'),
)!;

const specialty = aliasedTable(taxonomyTerms, 'doctor_specialty');

/** BR2.13: a pending doctor submission created this doctor. */
const memberAddedNotConfirmed = sql<boolean>`exists (
  select 1 from ${profileSubmissions}
  where ${profileSubmissions.kind} = 'doctor'
    and ${profileSubmissions.createdDoctorId} = "doctors"."id"
    and ${profileSubmissions.status} = 'pending'
)`.mapWith(Boolean);

const doctorColumns = {
  id: doctors.id,
  publicId: doctors.publicId,
  nameEn: doctors.nameEn,
  nameBn: doctors.nameBn,
  specialtyId: doctors.specialtyId,
  specialtyEn: specialty.nameEn,
  specialtyBn: specialty.nameBn,
  qualificationsEn: doctors.qualificationsEn,
  qualificationsBn: doctors.qualificationsBn,
  bmdcNumber: doctors.bmdcNumber,
  languagesEn: doctors.languagesEn,
  languagesBn: doctors.languagesBn,
  feeDisplayEn: doctors.feeDisplayEn,
  feeDisplayBn: doctors.feeDisplayBn,
  cityEn: doctors.cityEn,
  cityBn: doctors.cityBn,
  areaEn: doctors.areaEn,
  areaBn: doctors.areaBn,
  aboutEn: doctors.aboutEn,
  aboutBn: doctors.aboutBn,
  fieldProvenance: doctors.fieldProvenance,
  avatarHue: doctors.avatarHue,
  claimedBy: doctors.claimedByAccountId,
  createdAt: doctors.createdAt,
  updatedAt: doctors.updatedAt,
  memberAddedNotConfirmed,
};

type DoctorRow = Awaited<ReturnType<typeof selectDoctors>>[number];

function toDoctorRecord(row: DoctorRow): DoctorRecord {
  const { claimedBy, ...rest } = row;
  return {
    ...rest,
    fieldProvenance: row.fieldProvenance ?? {},
    claimed: claimedBy !== null,
    memberAddedNotConfirmed: Boolean(row.memberAddedNotConfirmed),
  };
}

const branchColumns = {
  id: facilityBranches.id,
  publicId: facilityBranches.publicId,
  facilityId: facilityBranches.facilityId,
  nameEn: facilityBranches.nameEn,
  nameBn: facilityBranches.nameBn,
  ownNameEn: facilityBranches.ownNameEn,
  ownNameBn: facilityBranches.ownNameBn,
  avatarHue: facilityBranches.avatarHue,
  cityEn: facilityBranches.cityEn,
  cityBn: facilityBranches.cityBn,
  areaEn: facilityBranches.areaEn,
  areaBn: facilityBranches.areaBn,
  addressEn: facilityBranches.addressEn,
  addressBn: facilityBranches.addressBn,
  fieldProvenance: facilityBranches.fieldProvenance,
  createdAt: facilityBranches.createdAt,
  updatedAt: facilityBranches.updatedAt,
  facilityNameEn: facilities.nameEn,
  facilityNameBn: facilities.nameBn,
  type: facilities.type,
  facilityClaimedBy: facilities.claimedByAccountId,
};

interface BranchRow {
  id: string;
  publicId: string;
  facilityId: string;
  nameEn: string;
  nameBn: string;
  ownNameEn: string | null;
  ownNameBn: string | null;
  avatarHue: number | null;
  cityEn: string;
  cityBn: string;
  areaEn: string | null;
  areaBn: string | null;
  addressEn: string | null;
  addressBn: string | null;
  fieldProvenance: unknown;
  createdAt: Date;
  updatedAt: Date | null;
  facilityNameEn: string;
  facilityNameBn: string;
  type: BranchRecord['type'];
  facilityClaimedBy: string | null;
}

function toBranchRecord(row: BranchRow): BranchRecord {
  const { facilityClaimedBy, ...rest } = row;
  return {
    ...rest,
    fieldProvenance: (row.fieldProvenance ?? {}) as FieldProvenanceRecord,
    claimed: facilityClaimedBy !== null,
  };
}

function doctorName(locale: Locale) {
  return locale === 'bn' ? doctors.nameBn : doctors.nameEn;
}

/** BR2.8 for branches: the title (own name, else organisation), then the label, then public id. */
function branchOrder(locale: Locale): SQL[] {
  const title =
    locale === 'bn'
      ? sql`coalesce(${facilityBranches.ownNameBn}, ${facilities.nameBn})`
      : sql`coalesce(${facilityBranches.ownNameEn}, ${facilities.nameEn})`;
  const label = locale === 'bn' ? facilityBranches.nameBn : facilityBranches.nameEn;
  return [byName(title), byName(label), sql`${facilityBranches.publicId}`];
}

/** A column's `doctorNameKey`, computed in PostgreSQL with the same title pattern (FD-100). */
function columnNameKey(column: typeof doctors.nameEn | typeof doctors.nameBn): SQL {
  return sql`lower(regexp_replace(regexp_replace(normalize(${column}, NFC), ${DOCTOR_TITLE_PATTERN}, '', 'i'), ${'\\s'}, '', 'g'))`;
}

function offsetOf(request: PageRequest): number {
  return Math.max(0, (request.page - 1) * request.pageSize);
}

function selectDoctors(tx: Tx) {
  return executorOf(tx)
    .select(doctorColumns)
    .from(doctors)
    .leftJoin(
      specialty,
      and(eq(specialty.id, doctors.specialtyId), eq(specialty.state, 'published')),
    );
}

function selectBranches(tx: Tx) {
  return executorOf(tx)
    .select(branchColumns)
    .from(facilityBranches)
    .innerJoin(facilities, eq(facilities.id, facilityBranches.facilityId));
}

export class PgDirectoryModuleRepository implements DirectoryRepository {
  async findDoctorByPublicId(tx: Tx, publicId: string): Promise<DoctorWithChambersRecord | null> {
    const [row] = await selectDoctors(tx)
      .where(and(isVisibleDoctor, eq(doctors.publicId, publicId)))
      .limit(1);
    if (!row) return null;
    const chamberRows = await executorOf(tx)
      .select({
        nameEn: doctorChambers.nameEn,
        nameBn: doctorChambers.nameBn,
        hoursEn: doctorChambers.hoursEn,
        hoursBn: doctorChambers.hoursBn,
        provenance: doctorChambers.provenance,
        createdAt: doctorChambers.createdAt,
        branchPublicId: sql<
          string | null
        >`case when ${isVisibleBranch} then ${facilityBranches.publicId} end`,
      })
      .from(doctorChambers)
      .leftJoin(facilityBranches, eq(facilityBranches.id, doctorChambers.branchId))
      .leftJoin(facilities, eq(facilities.id, facilityBranches.facilityId))
      .where(eq(doctorChambers.doctorId, row.id))
      .orderBy(
        asc(doctorChambers.sortOrder),
        asc(doctorChambers.createdAt),
        asc(doctorChambers.id),
      );
    const chambers: ChamberRecord[] = chamberRows.map((c) => ({
      ...c,
      branchPublicId: c.branchPublicId ?? null,
    }));
    return { ...toDoctorRecord(row), chambers };
  }

  async listDoctors(tx: Tx, request: PageRequest): Promise<PageOfRows<DoctorRecord>> {
    const rows = await selectDoctors(tx)
      .where(isVisibleDoctor)
      .orderBy(byName(doctorName(request.locale)), asc(doctors.publicId))
      .limit(request.pageSize)
      .offset(offsetOf(request));
    const [total] = await executorOf(tx)
      .select({ n: count() })
      .from(doctors)
      .where(isVisibleDoctor);
    return { rows: rows.map(toDoctorRecord), total: total?.n ?? 0 };
  }

  async findBranchByPublicId(tx: Tx, publicId: string): Promise<BranchRecord | null> {
    const [row] = await selectBranches(tx)
      .where(and(isVisibleBranch, eq(facilityBranches.publicId, publicId)))
      .limit(1);
    return row ? toBranchRecord(row) : null;
  }

  async listBranches(tx: Tx, request: PageRequest): Promise<PageOfRows<BranchRecord>> {
    const rows = await selectBranches(tx)
      .where(isVisibleBranch)
      .orderBy(...branchOrder(request.locale))
      .limit(request.pageSize)
      .offset(offsetOf(request));
    const [total] = await executorOf(tx)
      .select({ n: count() })
      .from(facilityBranches)
      .innerJoin(facilities, eq(facilities.id, facilityBranches.facilityId))
      .where(isVisibleBranch);
    return { rows: rows.map(toBranchRecord), total: total?.n ?? 0 };
  }

  async branchesOfFacility(tx: Tx, facilityId: string): Promise<BranchRecord[]> {
    if (!UUID_RE.test(facilityId)) return [];
    const rows = await selectBranches(tx)
      .where(and(isVisibleBranch, eq(facilityBranches.facilityId, facilityId)))
      .orderBy(...branchOrder('en'));
    return rows.map(toBranchRecord);
  }

  async doctorsAtBranch(tx: Tx, branchId: string, locale: Locale): Promise<DoctorRefRecord[]> {
    if (!UUID_RE.test(branchId)) return [];
    return executorOf(tx)
      .select({
        id: doctors.id,
        publicId: doctors.publicId,
        nameEn: doctors.nameEn,
        nameBn: doctors.nameBn,
        specialtyEn: specialty.nameEn,
        specialtyBn: specialty.nameBn,
        avatarHue: doctors.avatarHue,
      })
      .from(doctors)
      .leftJoin(
        specialty,
        and(eq(specialty.id, doctors.specialtyId), eq(specialty.state, 'published')),
      )
      .where(
        and(
          isVisibleDoctor,
          sql`exists (select 1 from ${doctorChambers} where ${doctorChambers.doctorId} = "doctors"."id" and ${doctorChambers.branchId} = ${branchId})`,
        ),
      )
      .orderBy(byName(doctorName(locale)), asc(doctors.publicId));
  }

  async branchesForDoctor(tx: Tx, doctorId: string): Promise<BranchRecord[]> {
    if (!UUID_RE.test(doctorId)) return [];
    const rows = await executorOf(tx)
      .select({ ...branchColumns, sortOrder: doctorChambers.sortOrder })
      .from(doctorChambers)
      .innerJoin(facilityBranches, eq(facilityBranches.id, doctorChambers.branchId))
      .innerJoin(facilities, eq(facilities.id, facilityBranches.facilityId))
      .where(and(eq(doctorChambers.doctorId, doctorId), isVisibleBranch))
      .orderBy(
        asc(doctorChambers.sortOrder),
        asc(doctorChambers.createdAt),
        asc(doctorChambers.id),
      );
    const seen = new Set<string>();
    const branches: BranchRecord[] = [];
    for (const { sortOrder: _sortOrder, ...row } of rows) {
      void _sortOrder;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      branches.push(toBranchRecord(row));
    }
    return branches;
  }

  async findVisibleDoctorsByNameKey(tx: Tx, key: string): Promise<NameKeyCandidate[]> {
    return executorOf(tx)
      .select({ id: doctors.id, specialtyId: doctors.specialtyId })
      .from(doctors)
      .where(
        and(
          isVisibleDoctor,
          sql`(${columnNameKey(doctors.nameEn)} = ${key} or ${columnNameKey(doctors.nameBn)} = ${key})`,
        ),
      )
      .orderBy(asc(doctors.createdAt), asc(doctors.id));
  }

  async lockDoctorNameKey(tx: Tx, key: string): Promise<void> {
    await executorOf(tx).execute(
      sql`select pg_advisory_xact_lock(hashtext(${'doctor-name:' + key}))`,
    );
  }

  async isPublishedSpecialty(tx: Tx, specialtyId: string): Promise<boolean> {
    if (!UUID_RE.test(specialtyId)) return false;
    const [row] = await executorOf(tx)
      .select({ id: taxonomyTerms.id })
      .from(taxonomyTerms)
      .where(
        and(
          eq(taxonomyTerms.id, specialtyId),
          eq(taxonomyTerms.kind, 'specialty'),
          eq(taxonomyTerms.state, 'published'),
          isNull(taxonomyTerms.canonicalId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async insertMemberDoctor(tx: Tx, doctor: NewMemberDoctor): Promise<void> {
    const db = executorOf(tx);
    const community = { source: 'community' as const, updatedAt: doctor.now.toISOString() };
    await db.insert(doctors).values({
      id: doctor.id,
      publicId: doctor.publicId,
      // Nothing is translated (FD-024): both languages show the name as the member wrote it.
      nameEn: doctor.name,
      nameBn: doctor.name,
      specialtyId: doctor.specialtyId,
      fieldProvenance: {
        name_en: community,
        name_bn: community,
        ...(doctor.specialtyId ? { specialty_id: community } : {}),
      },
      state: 'published',
      nameKey: doctor.nameKey,
      createdAt: doctor.now,
    });
    if (doctor.practiceArea) {
      await db.insert(doctorChambers).values({
        doctorId: doctor.id,
        nameEn: doctor.practiceArea,
        nameBn: doctor.practiceArea,
        provenance: 'community',
        createdAt: doctor.now,
      });
    }
    await db.insert(profileSubmissions).values({
      kind: 'doctor',
      // The BMDC number nobody has checked lives only here, never in `doctors.bmdc_number`.
      payload: {
        nameEn: doctor.name,
        nameBn: doctor.name,
        specialtyId: doctor.specialtyId,
        chamber: doctor.practiceArea,
        bmdc: doctor.bmdcNumber,
      },
      submittedByAccountId: doctor.submittedByAccountId,
      status: 'pending',
      createdDoctorId: doctor.id,
      createdAt: doctor.now,
    });
  }
}
