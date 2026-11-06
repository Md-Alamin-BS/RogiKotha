// Replaces: `renderProfile` (doctor profile) and the doctor listing cards in `renderDoctorIndex`
// (ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js). U46 functional-spec § 7.
// Every string is already in the reader's locale; a missing value is an absent field, never `0`
// or `""`; every id is a public id; no field is a percentage (BR2.1, BR2.2, BR2.9, BR2.10).
import type { FacilityType, Provenance } from '../enums';
import type { Iso8601 } from '../time';
import type { ExperienceCardVM } from './experience-card';

/** How eligible accounts spread over one enum: every key counted, with its denominator. */
export interface DistributionVM {
  /** Render order, e.g. `positive, mixed, negative`. */
  keys: string[];
  /** Every key present, zero included. */
  counts: Record<string, number>;
  /** Accounts with a recognised value: the denominator. */
  total: number;
  /** Eligible accounts that gave no value. */
  notProvided: number;
  empty: boolean;
  limitedData: boolean;
}

export interface ProvenanceVM {
  source: Provenance;
  updatedAt: Iso8601;
}

export const DOCTOR_FACT_KEYS = [
  'bmdc',
  'specialty',
  'qualifications',
  'languages',
  'fee',
] as const;
export type DoctorFactKey = (typeof DOCTOR_FACT_KEYS)[number];

export interface DoctorFactVM {
  key: DoctorFactKey;
  value: string;
  provenance: ProvenanceVM;
}

export interface ChamberVM {
  name: string;
  hours?: string;
  provenance: ProvenanceVM;
  branchPublicId?: string;
}

export interface ConditionRefVM {
  publicId: string;
  name: string;
}

export interface ConditionCountVM extends ConditionRefVM {
  count: number;
}

export interface ConditionBreakdownVM {
  condition: ConditionRefVM;
  sentiment: DistributionVM;
}

/** A branch named by BR3.11: its title, and its label when that differs. */
export interface FacilityRefVM {
  publicId: string;
  name: string;
  branchName?: string;
  type: FacilityType;
  avatarHue: number;
}

export interface DoctorCardVM {
  publicId: string;
  name: string;
  specialty?: string;
  area?: string;
  city?: string;
  avatarHue: number;
  /** At most three, by account count. */
  topConditions: ConditionCountVM[];
  documentsCount: number;
  accountsTotal: number;
  accountsLimitedData: boolean;
  sentiment: DistributionVM;
  claimed: boolean;
  registrationNotVerified: true;
  /** A member added this doctor and the submission is still pending (FD-100, BR2.13). */
  memberAddedNotConfirmed: boolean;
}

export interface DoctorProfileVM extends DoctorCardVM {
  about?: string;
  /** Populated facts only, in `DOCTOR_FACT_KEYS` order. */
  facts: DoctorFactVM[];
  chambers: ChamberVM[];
  conditions: ConditionCountVM[];
  breakdown: ConditionBreakdownVM[];
  facilities: FacilityRefVM[];
  accounts: ExperienceCardVM[];
  scopedSentiment: DistributionVM;
  scopedOutcome: DistributionVM;
  scopedTotal: number;
  showing: number;
  selectedCondition?: ConditionRefVM;
}
