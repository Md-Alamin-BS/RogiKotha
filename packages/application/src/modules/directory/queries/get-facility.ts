// `directory.getFacility` (WF4): one visible branch. Facility figures are read only when facility
// feedback is visible (BR2.12) and are the nine criteria only (FD-107).
import { err, GetFacilityInput, ok, stableHue, type FacilityProfileVM } from '@rogikotha/contracts';
import { textIn } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { DirectoryDeps } from '../deps';
import { branchTitle, facilityCard, provenanceOf } from '../mappers';

export function getFacilityQuery(deps: DirectoryDeps) {
  return defineQuery<GetFacilityInput, FacilityProfileVM>({
    name: 'directory.getFacility',
    input: GetFacilityInput,
    requires: {},
    async handle({ input, tx, actor, ports }) {
      const { locale } = actor;
      const branch = await deps.directory.findBranchByPublicId(tx, input.publicId);
      if (!branch) return err('not_found', { correlationId: actor.correlationId });
      const feedbackVisible = (await ports.config.current()).featureVisibility.facilityAccounts;
      const experience = feedbackVisible
        ? await deps.providerExperience.forBranch(tx, { branchId: branch.id, locale })
        : undefined;
      const doctors = await deps.directory.doctorsAtBranch(tx, branch.id, locale);
      const siblings = (await deps.directory.branchesOfFacility(tx, branch.facilityId)).filter(
        (b) => b.id !== branch.id,
      );

      const overall = experience?.criteria.find((c) => c.key === 'overall')?.dist;
      const card = facilityCard(
        branch,
        experience && overall
          ? { total: experience.total, limitedData: experience.limitedData, overall }
          : undefined,
        feedbackVisible,
        locale,
      );
      const fallback = branch.updatedAt ?? branch.createdAt;
      const address = textIn(locale, branch.addressEn, branch.addressBn);
      const profile: FacilityProfileVM = {
        ...card,
        provenance: {
          name: provenanceOf(branch.fieldProvenance, 'name', fallback),
          ...(address !== undefined
            ? { address: provenanceOf(branch.fieldProvenance, 'address', fallback) }
            : {}),
        },
        criteria: experience?.criteria ?? [],
        accounts: experience?.cards ?? [],
        doctorsHere: doctors.map((d) => {
          const specialty = textIn(locale, d.specialtyEn, d.specialtyBn);
          return {
            publicId: d.publicId,
            name: locale === 'bn' ? d.nameBn : d.nameEn,
            avatarHue: d.avatarHue ?? stableHue(d.publicId),
            ...(specialty !== undefined ? { specialty } : {}),
          };
        }),
        siblings: siblings.map((s) => {
          const names = branchTitle(s, locale);
          const area = textIn(locale, s.areaEn, s.areaBn);
          return {
            publicId: s.publicId,
            name: names.title,
            avatarHue: s.avatarHue ?? stableHue(s.publicId),
            ...(names.branchName !== undefined ? { branchName: names.branchName } : {}),
            ...(area !== undefined ? { area } : {}),
          };
        }),
      };
      if (address !== undefined) profile.address = address;
      return ok(profile);
    },
  });
}
