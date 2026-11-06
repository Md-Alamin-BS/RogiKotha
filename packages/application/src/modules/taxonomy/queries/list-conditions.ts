// `taxonomy.listConditions` (WF7): every active canonical condition by name, the ones nobody has
// written about included, because an empty topic is an invitation to write (BR4.4).
import { ListConditionsInput, ok, type ConditionCardVM } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { TaxonomyDeps } from '../deps';

export function listConditionsQuery(deps: TaxonomyDeps) {
  return defineQuery<ListConditionsInput, ConditionCardVM[]>({
    name: 'taxonomy.listConditions',
    input: ListConditionsInput,
    requires: {},
    async handle({ tx, actor }) {
      const { locale } = actor;
      const terms = await deps.taxonomy.listTerms(tx, 'condition', { canonicalOnly: true, locale });
      const totals = await deps.conditionStats.totalsForConditions(
        tx,
        terms.map((t) => t.id),
      );
      return ok(
        terms.map((t) => ({
          publicId: t.publicId,
          name: locale === 'bn' ? t.nameBn : t.nameEn,
          accountsTotal: totals.get(t.id) ?? 0,
        })),
      );
    },
  });
}
