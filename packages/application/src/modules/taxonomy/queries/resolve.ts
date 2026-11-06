// `taxonomy.resolve` (WF8, BR4.3): an exact match of the normalised wording against active name and
// alias keys, as the effective term; an ambiguous match resolves to nothing. Fuzzy matching is
// search's (T-205, release 2).
import { err, ok, ResolveInput } from '@rogikotha/contracts';
import { normalizeAliasKey } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { TaxonomyDeps } from '../deps';

export type ResolveResult =
  | {
      termId: string;
      publicId: string;
      name: string;
      matchedAlias?: string;
      provisional: boolean;
    }
  | { ambiguous: true }
  | Record<string, never>;

export function resolveQuery(deps: TaxonomyDeps) {
  return defineQuery<ResolveInput, ResolveResult>({
    name: 'taxonomy.resolve',
    input: ResolveInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const key = normalizeAliasKey(input.text);
      if (key === '') {
        return err('validation', {
          correlationId: actor.correlationId,
          fieldErrors: { text: 'errors.common.validation' },
        });
      }
      const matches = await deps.taxonomy.findByKey(tx, key, input.kind);
      const distinct = [...new Map(matches.map((m) => [m.term.id, m])).values()];
      const [only] = distinct;
      if (distinct.length > 1) return ok({ ambiguous: true });
      if (!only) return ok({});
      return ok({
        termId: only.term.id,
        publicId: only.term.publicId,
        name: actor.locale === 'bn' ? only.term.nameBn : only.term.nameEn,
        provisional: only.term.provisional,
        ...(only.matchedAlias !== null ? { matchedAlias: only.matchedAlias } : {}),
      });
    },
  });
}
