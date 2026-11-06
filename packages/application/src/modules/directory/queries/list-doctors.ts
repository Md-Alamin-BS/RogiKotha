// `directory.listDoctors` (WF3): visible doctors by name in the reader's locale (Question 6), with
// one grouped summary read for the whole page (BR3.10).
import { ListDoctorsInput, ok, type BoundedPage, type DoctorCardVM } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { DEFAULT_PAGE_SIZE, type DirectoryDeps } from '../deps';
import { doctorCard } from '../mappers';

export function listDoctorsQuery(deps: DirectoryDeps) {
  return defineQuery<ListDoctorsInput, BoundedPage<DoctorCardVM>>({
    name: 'directory.listDoctors',
    input: ListDoctorsInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
      const { rows, total } = await deps.directory.listDoctors(tx, {
        page,
        pageSize,
        locale: actor.locale,
      });
      const summaries = await deps.providerExperience.summariesForDoctors(
        tx,
        rows.map((r) => r.id),
        actor.locale,
      );
      const items = rows.flatMap((row) => {
        const summary = summaries.get(row.id);
        return summary ? [doctorCard(row, summary, actor.locale)] : [];
      });
      return ok({ items, page, pageSize, total });
    },
  });
}
