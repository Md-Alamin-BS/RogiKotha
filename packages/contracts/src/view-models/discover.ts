// Replaces: `renderDiscover` (home page — hero search, browse tiles,
// emergency panel), app.js. Maps from RK.conditions, RK.doctors,
// RK.facilities and the `config.emergency` values (02-data-model.md §11).
//
// TODO(T-207): owner refines every field below against the ported
// component (Discover/Emergency/About).
import type { ConditionCardVM } from './condition.js';
import type { DoctorCardVM } from './doctor.js';
import type { FacilityCardVM } from './facility.js';

export interface EmergencyPanelVM {
  ambulance: string;
  healthLine: string;
  crisisLine: string;
  lastVerified: string;
}

export interface DiscoverVM {
  featuredConditions: ConditionCardVM[];
  featuredDoctors: DoctorCardVM[];
  featuredFacilities: FacilityCardVM[];
  emergency: EmergencyPanelVM;
}
