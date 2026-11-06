// Replaces: `renderCondition` (topic page) and `renderTopicIndex`, app.js 1173-1322 and
// 1906-1924. U46 functional-spec § 7. Every count is of distinct eligible accounts (BR3.3, BR3.4).
import type { DistributionVM, FacilityRefVM } from './doctor';
import type { ExperienceCardVM } from './experience-card';

export interface ConditionCardVM {
  publicId: string;
  name: string;
  /** Zero included: an empty topic is listed (BR4.4). */
  accountsTotal: number;
}

export interface ConditionMentionVM {
  label: string;
  count: number;
}

export interface ConditionPlaceVM {
  hospital?: string;
  area?: string;
  city?: string;
  count: number;
}

export interface ConditionDoctorVM {
  publicId: string;
  name: string;
  specialty?: string;
  count: number;
  primaryChamber?: string;
  area?: string;
  city?: string;
  avatarHue: number;
}

export interface ConditionPageVM {
  publicId: string;
  name: string;
  provisional: boolean;
  aliases: string[];
  accountsTotal: number;
  accountsLimitedData: boolean;
  doctorsTotal: number;
  /** At most three, by account count. */
  specialties: { name: string; count: number }[];
  places: ConditionPlaceVM[];
  sentiment: DistributionVM;
  outcome: DistributionVM;
  medicines: ConditionMentionVM[];
  treatments: ConditionMentionVM[];
  symptoms: ConditionMentionVM[];
  accounts: ExperienceCardVM[];
  doctors: ConditionDoctorVM[];
  facilities: FacilityRefVM[];
}
