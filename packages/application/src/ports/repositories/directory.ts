// The Directory repository port (U46 functional-spec § 8). Rows carry both languages; the module
// maps them to the reader's locale. Every read applies BR1.1 (doctor published, not merged) and
// BR1.2 (branch and organisation published); nothing here reads a review-side table (BR6.2).
import type { FacilityType, Locale, Provenance } from '@rogikotha/contracts';

import type { Tx } from '../unit-of-work';

export interface ProvenanceEntryRecord {
  source: Provenance;
  updatedAt: string;
  hidden?: boolean;
}

export type FieldProvenanceRecord = Record<string, ProvenanceEntryRecord>;

export interface DoctorRecord {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
  specialtyId: string | null;
  specialtyEn: string | null;
  specialtyBn: string | null;
  qualificationsEn: string | null;
  qualificationsBn: string | null;
  bmdcNumber: string | null;
  languagesEn: string | null;
  languagesBn: string | null;
  feeDisplayEn: string | null;
  feeDisplayBn: string | null;
  cityEn: string | null;
  cityBn: string | null;
  areaEn: string | null;
  areaBn: string | null;
  aboutEn: string | null;
  aboutBn: string | null;
  fieldProvenance: FieldProvenanceRecord;
  avatarHue: number | null;
  claimed: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  /** A pending doctor submission created this doctor (BR2.13), from the same query. */
  memberAddedNotConfirmed: boolean;
}

export interface ChamberRecord {
  nameEn: string;
  nameBn: string;
  hoursEn: string | null;
  hoursBn: string | null;
  provenance: Provenance;
  createdAt: Date;
  /** Present only when the chamber's branch is visible (BR1.2). */
  branchPublicId: string | null;
}

export interface DoctorWithChambersRecord extends DoctorRecord {
  /** In `sort_order`; the first is the primary chamber. */
  chambers: ChamberRecord[];
}

export interface BranchRecord {
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
  fieldProvenance: FieldProvenanceRecord;
  createdAt: Date;
  updatedAt: Date | null;
  facilityNameEn: string;
  facilityNameBn: string;
  type: FacilityType;
  claimed: boolean;
}

export interface DoctorRefRecord {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
  specialtyEn: string | null;
  specialtyBn: string | null;
  avatarHue: number | null;
}

export interface PageRequest {
  page: number;
  pageSize: number;
  locale: Locale;
}

export interface PageOfRows<T> {
  rows: T[];
  total: number;
}

export interface NameKeyCandidate {
  id: string;
  specialtyId: string | null;
}

/** Everything `addMemberDoctor` writes when it creates a doctor (BR5.7). */
export interface NewMemberDoctor {
  id: string;
  publicId: string;
  /** As typed, trimmed and with spaces collapsed; written to both name columns. */
  name: string;
  nameKey: string;
  specialtyId: string | null;
  practiceArea: string | null;
  /** Kept only in the submission payload, never in `doctors.bmdc_number` (FD-100). */
  bmdcNumber: string | null;
  submittedByAccountId: string;
  now: Date;
}

export interface DirectoryRepository {
  findDoctorByPublicId(tx: Tx, publicId: string): Promise<DoctorWithChambersRecord | null>;
  /** Visible doctors by name in `locale`, tie public id (BR2.8). */
  listDoctors(tx: Tx, request: PageRequest): Promise<PageOfRows<DoctorRecord>>;
  findBranchByPublicId(tx: Tx, publicId: string): Promise<BranchRecord | null>;
  /** Visible branches by title, then label, tie public id (BR2.8). */
  listBranches(tx: Tx, request: PageRequest): Promise<PageOfRows<BranchRecord>>;
  /** The organisation's visible branches, the given one included. */
  branchesOfFacility(tx: Tx, facilityId: string): Promise<BranchRecord[]>;
  /** Visible doctors with a chamber at the branch (BR1.2), by name in `locale`. */
  doctorsAtBranch(tx: Tx, branchId: string, locale: Locale): Promise<DoctorRefRecord[]>;
  /** Visible branches where the doctor has a chamber, in chamber order. */
  branchesForDoctor(tx: Tx, doctorId: string): Promise<BranchRecord[]>;
  findVisibleDoctorsByNameKey(tx: Tx, key: string): Promise<NameKeyCandidate[]>;
  /** A transaction-scoped lock on `doctor-name:<key>`, released with the caller's transaction. */
  lockDoctorNameKey(tx: Tx, key: string): Promise<void>;
  isPublishedSpecialty(tx: Tx, specialtyId: string): Promise<boolean>;
  /** The doctor, its optional chamber and its pending submission. */
  insertMemberDoctor(tx: Tx, doctor: NewMemberDoctor): Promise<void>;
}
