// Replaces: `renderProfile` (doctor profile) and the doctor listing cards in
// `renderDoctorIndex`/`renderResults` in
// ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js.
// Maps from RK.doctors, RK.facilities (chambers' branch), RK.reviews
// (sentiment/outcome/byCondition aggregates, accountsCount).
//
// TODO(T-202): owner refines every field below (exact set, nullability,
// index-card shape) against the ported component.
import type { Iso8601 } from '../time';
import type { Provenance } from '../enums';

/** Shared by every "spread across accounts" summary (sentiment, outcome, criteria). */
export interface DistributionVM {
  counts: Record<string, number>;
  total: number;
  limitedData: boolean;
}

export interface ProvenanceFieldVM {
  source: Provenance;
  updatedAt: Iso8601;
}

export interface ChamberVM {
  name: string;
  hours?: string;
  provenance: Provenance;
  branchPublicId?: string;
}

export interface ConditionRefVM {
  publicId: string;
  name: string;
}

export interface FacilityRefVM {
  publicId: string;
  name: string;
  city: string;
  area: string;
}

export interface DoctorCardVM {
  publicId: string;
  name: string;
  specialty: string;
  city: string;
  area: string;
  feeDisplay?: string;
  claimed: boolean;
  registrationNotVerified: true;
  accountsCount: number;
}

export interface DoctorProfileVM {
  publicId: string;
  name: string;
  specialty: string;
  qualifications?: string;
  bmdcNumber?: string;
  gender?: string;
  languages?: string;
  feeDisplay?: string;
  city: string;
  area: string;
  about?: string;
  chambers: ChamberVM[];
  provenance: Record<string, ProvenanceFieldVM>;
  claimed: boolean;
  registrationNotVerified: true;
  sentiment: DistributionVM;
  outcome: DistributionVM;
  byCondition: { condition: ConditionRefVM; count: number }[];
  accountsCount: number;
  facilities: FacilityRefVM[];
}
