// `directory.getDoctor` (WF2): a visible doctor's profile with figures from `ProviderExperience`.
// A missing, unpublished or merged doctor is `not_found` (BR1.1); queries never write (BR6.5).
import { err, GetDoctorInput, ok, type DoctorProfileVM } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { DirectoryDeps } from '../deps';
import { doctorProfile } from '../mappers';

export function getDoctorQuery(deps: DirectoryDeps) {
  return defineQuery<GetDoctorInput, DoctorProfileVM>({
    name: 'directory.getDoctor',
    input: GetDoctorInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const doctor = await deps.directory.findDoctorByPublicId(tx, input.publicId);
      if (!doctor) return err('not_found', { correlationId: actor.correlationId });
      const experience = await deps.providerExperience.forDoctor(tx, {
        doctorId: doctor.id,
        locale: actor.locale,
        ...(input.condition !== undefined ? { conditionPublicId: input.condition } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
        ...(input.relationship !== undefined ? { relationship: input.relationship } : {}),
        ...(input.docs !== undefined ? { docs: input.docs } : {}),
      });
      const branches = await deps.directory.branchesForDoctor(tx, doctor.id);
      return ok(doctorProfile(doctor, experience, branches, actor.locale));
    },
  });
}
