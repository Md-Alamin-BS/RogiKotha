// `directory.facilitiesForDoctor` (WF5, C7): the visible branches where a visible doctor has a
// chamber, named by BR3.11.
import { err, FacilitiesForDoctorInput, ok, type FacilityRefVM } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { DirectoryDeps } from '../deps';
import { facilityRef } from '../mappers';

export function facilitiesForDoctorQuery(deps: DirectoryDeps) {
  return defineQuery<FacilitiesForDoctorInput, FacilityRefVM[]>({
    name: 'directory.facilitiesForDoctor',
    input: FacilitiesForDoctorInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const doctor = await deps.directory.findDoctorByPublicId(tx, input.doctorPublicId);
      if (!doctor) return err('not_found', { correlationId: actor.correlationId });
      const branches = await deps.directory.branchesForDoctor(tx, doctor.id);
      return ok(branches.map((b) => facilityRef(b, actor.locale)));
    },
  });
}
