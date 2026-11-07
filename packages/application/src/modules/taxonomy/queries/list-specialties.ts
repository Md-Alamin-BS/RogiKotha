// `taxonomy.listSpecialties` (U47 Q19, recorded addition): the published specialties by name, for
// the composer's add-a-doctor field (BR3.11). The id is what `directory.addMemberDoctor` takes.
import { ReviewEmptyInput, ok } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { TaxonomyDeps } from '../deps';

export interface SpecialtyOptionVM {
  id: string;
  name: string;
}

export function listSpecialtiesQuery(deps: TaxonomyDeps) {
  return defineQuery<ReviewEmptyInput, SpecialtyOptionVM[]>({
    name: 'taxonomy.listSpecialties',
    input: ReviewEmptyInput,
    requires: {},
    async handle({ tx, actor }) {
      const terms = await deps.taxonomy.listPublished(tx, 'specialty', actor.locale);
      return ok(
        terms.map((t) => ({ id: t.id, name: actor.locale === 'bn' ? t.nameBn : t.nameEn })),
      );
    },
  });
}
