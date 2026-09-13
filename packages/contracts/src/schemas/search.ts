// Input schemas for the `search` command catalogue
// (03-routes-and-contracts.md §4 "search (T-205)" and §1's URL map, which
// notes the module accepts more tabs/filters than the page currently
// renders).
import { z } from 'zod';

import { FACILITY_TYPES, OUTCOMES, SEARCH_KINDS, SENTIMENTS } from '../enums';
import { PUBLIC_ID_RE } from '../ids';

const SEARCH_TABS = ['doctors', 'facilities', 'conditions', 'reviews'] as const;
const SEARCH_SORTS = ['relevance', 'volume', 'recent'] as const;
// ASSUMPTION(T-003): the data model has no formal `gender` enum (doctors.gender
// is free `text null`); the prototype's search filter only ever offers these
// two values, so they are encoded here rather than left an open string —
// logged as ISS-074 for whoever widens it.
const GENDERS = ['male', 'female'] as const;
const REVIEW_LANGUAGES = ['en', 'bn', 'mixed'] as const;

const SearchFilters = z
  .object({
    specialty: z.string().min(1).optional(),
    condition: z.string().regex(PUBLIC_ID_RE).optional(),
    city: z.string().min(1).optional(),
    sentiment: z.enum(SENTIMENTS).optional(),
    outcome: z.enum(OUTCOMES).optional(),
    hasEvidence: z.boolean().optional(),
    gender: z.enum(GENDERS).optional(),
    language: z.enum(REVIEW_LANGUAGES).optional(),
    facilityType: z.enum(FACILITY_TYPES).optional(),
  })
  .strict();

export const SearchQueryInput = z
  .object({
    q: z.string().min(1),
    tab: z.enum(SEARCH_TABS),
    sort: z.enum(SEARCH_SORTS),
    filters: SearchFilters.optional(),
    page: z.number().int().min(1).optional(),
  })
  .strict();

export const SearchSuggestInput = z.object({ q: z.string().min(1) }).strict();

// job payload — ids only (05-routes §5 "Outbox events and jobs")
export const SearchRefreshJobInput = z
  .object({
    kind: z.enum(SEARCH_KINDS),
    refId: z.string().min(1),
  })
  .strict();

export const searchSchemas = {
  SearchQueryInput,
  SearchSuggestInput,
  SearchRefreshJobInput,
};
