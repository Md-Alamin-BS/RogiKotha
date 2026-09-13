// Replaces: `renderResults` (search results) and `renderTray`/`openCompare`
// (compare tray/sheet), app.js. Maps from the `search.query` command's
// output (03-routes-and-contracts.md §4 "search (T-205)").
//
// TODO(T-206): owner refines every field below against the ported
// component; `SearchResultItemVM`'s card union is a placeholder — the
// actual page renders two tabs (doctors, facilities) with conditions/
// reviews as a documented follow-up (03-routes-and-contracts.md §1).
import type { SearchKind } from '../enums.js';
import type { ConditionCardVM } from './condition.js';
import type { DoctorCardVM } from './doctor.js';
import type { ExperienceCardVM } from './experience.js';
import type { FacilityCardVM } from './facility.js';

export interface ResolvedNoteVM {
  original: string;
  resolvedTo: string;
  kind: 'banglish' | 'alias' | 'typo';
}

export interface SearchResultItemVM {
  kind: SearchKind;
  card: DoctorCardVM | FacilityCardVM | ConditionCardVM | ExperienceCardVM;
}

export interface SearchResultsVM {
  q: string;
  tab: 'doctors' | 'facilities' | 'conditions' | 'reviews';
  sort: 'relevance' | 'volume' | 'recent';
  results: SearchResultItemVM[];
  total: number;
  resolvedNote?: ResolvedNoteVM;
  keepOriginalUrl?: string;
}
