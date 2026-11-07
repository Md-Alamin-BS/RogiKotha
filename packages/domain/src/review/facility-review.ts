// Facility visit accounts (U47 BR3.10, FR27, FR49): optional, never-scored criteria. The criterion
// and value lists are passed in from `contracts` (CRITERIA, CRITERION_VALUES), as U46's
// `distribution` takes its keys, because the domain imports nothing.
import { type CalendarMonth, periodValid, quickStorySatisfied } from './review';

export type CriteriaInput = Readonly<Record<string, unknown>> | null | undefined;

/**
 * True when every given key is one of `keys` and every value is one of `values` or absent
 * (null or undefined). No criteria at all is valid: each one is optional.
 */
export function criteriaValid(
  criteria: CriteriaInput,
  keys: readonly string[],
  values: readonly string[],
): boolean {
  if (criteria === null || criteria === undefined) return true;
  const knownKeys = new Set(keys);
  const knownValues = new Set(values);
  return Object.entries(criteria).every(
    ([key, value]) =>
      knownKeys.has(key) &&
      (value === null ||
        value === undefined ||
        (typeof value === 'string' && knownValues.has(value))),
  );
}

/** The stored form: every key present, an unanswered criterion as null (BR3.10). */
export function completeCriteria<K extends string, V extends string>(
  criteria: Readonly<Partial<Record<K, V | null>>> | null | undefined,
  keys: readonly K[],
): Record<K, V | null> {
  return Object.fromEntries(keys.map((key) => [key, criteria?.[key] ?? null])) as Record<
    K,
    V | null
  >;
}

export const FACILITY_MINIMUM_FIELDS = ['branch', 'period', 'story'] as const;
export type FacilityMinimumField = (typeof FACILITY_MINIMUM_FIELDS)[number];

export interface FacilityMinimumInput {
  branchVisible: boolean;
  period?: CalendarMonth | null | undefined;
  today: CalendarMonth;
  story?: string | null | undefined;
}

/** Every missing minimum item of a facility visit, in the order branch, period, story (BR3.10). */
export function facilityMinimumFieldsMissing(input: FacilityMinimumInput): FacilityMinimumField[] {
  const missing: FacilityMinimumField[] = [];
  if (!input.branchVisible) missing.push('branch');
  if (!periodValid(input.period, input.today)) missing.push('period');
  if (!quickStorySatisfied(input.story)) missing.push('story');
  return missing;
}
