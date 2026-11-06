// `taxonomy.getCondition` (WF6): an active canonical condition, or an active unmapped provisional
// one marked provisional; a hidden, mapped or non-condition term is `not_found` (BR4.6).
import { err, GetConditionInput, ok, type ConditionPageVM } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { TaxonomyDeps } from '../deps';

export function getConditionQuery(deps: TaxonomyDeps) {
  return defineQuery<GetConditionInput, ConditionPageVM>({
    name: 'taxonomy.getCondition',
    input: GetConditionInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const { locale } = actor;
      const term = await deps.taxonomy.findTermByPublicId(tx, input.publicId);
      if (!term || term.kind !== 'condition' || !term.published || term.canonicalId !== null) {
        return err('not_found', { correlationId: actor.correlationId });
      }
      const name = locale === 'bn' ? term.nameBn : term.nameEn;
      const aliases = (await deps.taxonomy.aliasesOf(tx, term.id)).filter((a) => a !== name);
      const figures = await deps.conditionStats.forCondition(tx, term.id, locale);
      return ok({
        publicId: term.publicId,
        name,
        provisional: term.provisional,
        aliases,
        accountsTotal: figures.total,
        accountsLimitedData: figures.limitedData,
        doctorsTotal: figures.doctorsTotal,
        specialties: figures.specialties,
        places: figures.places,
        sentiment: figures.sentiment,
        outcome: figures.outcome,
        medicines: figures.mentioned.medicine,
        treatments: figures.mentioned.treatment,
        symptoms: figures.mentioned.symptom,
        accounts: figures.cards,
        doctors: figures.doctors,
        facilities: figures.facilities,
      });
    },
  });
}
