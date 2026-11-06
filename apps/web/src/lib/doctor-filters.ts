// The doctor profile's filters in the URL (U46 frontend-components § 3, BR9.3): an invalid value is
// dropped, never an error, and every filter link is built by `filterHref`, so the server and the
// client agree on one query-string shape.
import {
  isPublicId,
  OUTCOMES,
  RELATIONSHIPS,
  type Outcome,
  type Relationship,
} from '@rogikotha/contracts';

export interface ProfileFilters {
  condition?: string;
  outcome?: Outcome;
  relationship?: Relationship;
  docs?: boolean;
}

export type RawSearch = Record<string, string | string[] | undefined>;

/** The first value of a repeated parameter. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[], value: string | undefined): T | undefined {
  return value !== undefined && (values as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function parseProfileFilters(raw: RawSearch | undefined): ProfileFilters {
  const filters: ProfileFilters = {};
  const condition = first(raw?.condition);
  if (condition !== undefined && isPublicId(condition)) filters.condition = condition;
  const outcome = oneOf(OUTCOMES, first(raw?.outcome));
  if (outcome) filters.outcome = outcome;
  const relationship = oneOf(RELATIONSHIPS, first(raw?.relationship));
  if (relationship) filters.relationship = relationship;
  if (first(raw?.docs) === '1') filters.docs = true;
  return filters;
}

/** `/doctors/{id}` with the filters that are set, in a fixed order; locale prefixing is `Link`'s. */
export function filterHref(publicId: string, filters: ProfileFilters): string {
  const params = new URLSearchParams();
  if (filters.condition) params.set('condition', filters.condition);
  if (filters.outcome) params.set('outcome', filters.outcome);
  if (filters.relationship) params.set('relationship', filters.relationship);
  if (filters.docs) params.set('docs', '1');
  const query = params.toString();
  return query ? `/doctors/${publicId}?${query}` : `/doctors/${publicId}`;
}
