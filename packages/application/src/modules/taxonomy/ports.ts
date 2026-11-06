// `ConditionStats` (C6 as amended by U46, FD-067): the only way Taxonomy learns review-derived
// figures. Declared here, implemented by the Review module (`modules/review/condition-stats.ts`),
// so Taxonomy never imports Review (BR6.1). Review returns names, because Taxonomy may not read
// Directory.
import type {
  ConditionDoctorVM,
  ConditionMentionVM,
  ConditionPlaceVM,
  DistributionVM,
  ExperienceCardVM,
  FacilityRefVM,
  Locale,
} from '@rogikotha/contracts';

import type { Tx } from '../../ports';

export interface ConditionFigures {
  total: number;
  limitedData: boolean;
  doctorsTotal: number;
  sentiment: DistributionVM;
  outcome: DistributionVM;
  cards: ExperienceCardVM[];
  mentioned: {
    medicine: ConditionMentionVM[];
    treatment: ConditionMentionVM[];
    symptom: ConditionMentionVM[];
  };
  doctors: ConditionDoctorVM[];
  facilities: FacilityRefVM[];
  places: ConditionPlaceVM[];
  specialties: { name: string; count: number }[];
}

export interface ConditionStats {
  forCondition(tx: Tx, termId: string, locale: Locale): Promise<ConditionFigures>;
  /** Eligible accounts about each term by BR1.7; every id is a key, 0 included (BR4.4). */
  totalsForConditions(tx: Tx, termIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
}
