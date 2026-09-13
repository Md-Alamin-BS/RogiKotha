// Replaces: `renderCondition` (topic/condition page) and the topic index
// cards, app.js. Maps from RK.conditions (name, aliases) and RK.reviews
// (tags grouped by tag_group, doctorId, sentiment/outcome).
//
// TODO(T-203): owner refines every field below against the ported
// component; the aliases list (incl. Banglish) is taxonomy_aliases, not
// rendered here directly.
import type { DistributionVM, FacilityRefVM } from './doctor.js';

export interface ConditionCardVM {
  publicId: string;
  name: string;
  accountsCount: number;
}

export interface ConditionDoctorRefVM {
  publicId: string;
  name: string;
  specialty: string;
  count: number;
}

export interface ConditionPageVM {
  publicId: string;
  name: string;
  sentiment: DistributionVM;
  outcome: DistributionVM;
  medicines: { name: string; count: number }[];
  treatments: { name: string; count: number }[];
  symptoms: { name: string; count: number }[];
  doctors: ConditionDoctorRefVM[];
  facilities: FacilityRefVM[];
  districts: { name: string; count: number }[];
  accountsCount: number;
}
