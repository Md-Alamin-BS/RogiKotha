// `directory.doctorsAtBranch` (WF5, C7): visible doctors with a chamber at a visible branch; the
// chamber is the only doctor–branch link (BR1.2).
import { err, DoctorsAtBranchInput, ok, stableHue } from '@rogikotha/contracts';
import { textIn } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { DirectoryDeps } from '../deps';

export interface DoctorAtBranchVM {
  publicId: string;
  name: string;
  specialty?: string;
  avatarHue: number;
}

export function doctorsAtBranchQuery(deps: DirectoryDeps) {
  return defineQuery<DoctorsAtBranchInput, DoctorAtBranchVM[]>({
    name: 'directory.doctorsAtBranch',
    input: DoctorsAtBranchInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const { locale } = actor;
      const branch = await deps.directory.findBranchByPublicId(tx, input.branchPublicId);
      if (!branch) return err('not_found', { correlationId: actor.correlationId });
      const doctors = await deps.directory.doctorsAtBranch(tx, branch.id, locale);
      return ok(
        doctors.map((d) => {
          const specialty = textIn(locale, d.specialtyEn, d.specialtyBn);
          return {
            publicId: d.publicId,
            name: locale === 'bn' ? d.nameBn : d.nameEn,
            avatarHue: d.avatarHue ?? stableHue(d.publicId),
            ...(specialty !== undefined ? { specialty } : {}),
          };
        }),
      );
    },
  });
}
