// `directory.listFacilities` (WF5): visible branches by title, then label (BR2.8); facility figures
// only when facility feedback is visible (BR2.12), in one grouped read (BR3.10).
import {
  ListFacilitiesInput,
  ok,
  type BoundedPage,
  type FacilityCardVM,
} from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { DEFAULT_PAGE_SIZE, type DirectoryDeps } from '../deps';
import { facilityCard } from '../mappers';

export function listFacilitiesQuery(deps: DirectoryDeps) {
  return defineQuery<ListFacilitiesInput, BoundedPage<FacilityCardVM>>({
    name: 'directory.listFacilities',
    input: ListFacilitiesInput,
    requires: {},
    async handle({ input, tx, actor, ports }) {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
      const { rows, total } = await deps.directory.listBranches(tx, {
        page,
        pageSize,
        locale: actor.locale,
      });
      const feedbackVisible = (await ports.config.current()).featureVisibility.facilityAccounts;
      const summaries = feedbackVisible
        ? await deps.providerExperience.summariesForBranches(
            tx,
            rows.map((r) => r.id),
          )
        : undefined;
      const items = rows.map((row) =>
        facilityCard(row, summaries?.get(row.id), feedbackVisible, actor.locale),
      );
      return ok({ items, page, pageSize, total });
    },
  });
}
