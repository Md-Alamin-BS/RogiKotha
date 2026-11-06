// Replaces: `renderFacility` (branch profile) and `facilityEntry` (index), app.js 733-748 and
// 1324-1412. U46 functional-spec § 7. A branch is named by BR3.11; facility feedback is the nine
// criteria only (FD-107) and never meets a doctor's figures (BR2.6, BR2.7).
import type { Criterion, CriterionValue, FacilityType } from '../enums';
import type { DistributionVM, ProvenanceVM } from './doctor';
import type { BylineVM } from './experience-card';

export interface FacilityCardVM {
  /** The branch's public id. */
  publicId: string;
  /** The title: the branch's own name, else its organisation's. */
  name: string;
  branchName?: string;
  parentName?: string;
  type: FacilityType;
  area?: string;
  city: string;
  avatarHue: number;
  feedbackVisible: boolean;
  /** The three below are present exactly when `feedbackVisible` (BR2.12). */
  accountsTotal?: number;
  accountsLimitedData?: boolean;
  overall?: DistributionVM;
  claimed: boolean;
  notVerified: true;
}

export interface FacilityAccountVM {
  publicId: string;
  author: BylineVM;
  period: { year: number; month: number };
  /** ISO date (`YYYY-MM-DD`) of publication. */
  posted: string;
  body: string;
  overall?: CriterionValue;
  /** Answered criteria only, in enum order. */
  criteria: { key: Criterion; value: CriterionValue }[];
}

export interface FacilityProfileVM extends FacilityCardVM {
  address?: string;
  provenance: { name: ProvenanceVM; address?: ProvenanceVM };
  /** Nine, in enum order; empty when facility feedback is off. */
  criteria: { key: Criterion; dist: DistributionVM }[];
  /** Empty when facility feedback is off. */
  accounts: FacilityAccountVM[];
  doctorsHere: { publicId: string; name: string; specialty?: string; avatarHue: number }[];
  siblings: {
    publicId: string;
    name: string;
    branchName?: string;
    area?: string;
    avatarHue: number;
  }[];
}
