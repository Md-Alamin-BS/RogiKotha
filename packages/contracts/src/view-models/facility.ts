// Replaces: `renderFacility` (facility/branch profile) and the facility
// listing cards in `renderFacility` index view, app.js. Maps from
// RK.facilities (name, branch, parent, city, area, provenance, doctors[]).
//
// TODO(T-203): owner refines every field below against the ported
// component; parent-vs-branch aggregation (denominators disclosed at the
// parent level per 03-routes-and-contracts.md §1) is this task's call.
import type { FacilityType } from '../enums.js';
import type { DistributionVM, ProvenanceFieldVM } from './doctor.js';

export interface FacilityDoctorRefVM {
  publicId: string;
  name: string;
  specialty: string;
}

export interface FacilityCardVM {
  publicId: string;
  name: string;
  type: FacilityType;
  city: string;
  area: string;
  claimed: boolean;
}

export interface FacilityProfileVM {
  publicId: string;
  name: string;
  parentName?: string;
  type: FacilityType;
  city: string;
  area: string;
  address?: string;
  provenance: Record<string, ProvenanceFieldVM>;
  claimed: boolean;
  criteria: DistributionVM;
  siblingBranches: { publicId: string; name: string; city: string; area: string }[];
  doctors: FacilityDoctorRefVM[];
}
