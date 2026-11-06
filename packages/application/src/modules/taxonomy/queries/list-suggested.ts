// `taxonomy.listSuggested` (WF9, BR4.5): the composer's suggestion chips for a tag group, in
// suggested order. A tag group's name is its term kind.
import { ListSuggestedInput, ok } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { TaxonomyDeps } from '../deps';

export interface SuggestedTermVM {
  termId: string;
  publicId: string;
  name: string;
}

export function listSuggestedQuery(deps: TaxonomyDeps) {
  return defineQuery<ListSuggestedInput, SuggestedTermVM[]>({
    name: 'taxonomy.listSuggested',
    input: ListSuggestedInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const terms = await deps.taxonomy.listSuggested(tx, input.group, actor.locale);
      return ok(
        terms.map((t) => ({
          termId: t.id,
          publicId: t.publicId,
          name: actor.locale === 'bn' ? t.nameBn : t.nameEn,
        })),
      );
    },
  });
}
