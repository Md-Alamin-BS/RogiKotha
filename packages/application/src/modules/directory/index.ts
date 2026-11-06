// The Directory module (U46, T-201 + T-202 + T-203). Nothing here imports the Review module or the
// review repository port: review figures arrive through `ProviderExperience` (BR6.1, FD-067).
import type { DirectoryDeps } from './deps';
import { addMemberDoctorOperation } from './internal/add-member-doctor';
import { doctorsAtBranchQuery } from './queries/doctors-at-branch';
import { facilitiesForDoctorQuery } from './queries/facilities-for-doctor';
import { getDoctorQuery } from './queries/get-doctor';
import { getFacilityQuery } from './queries/get-facility';
import { listDoctorsQuery } from './queries/list-doctors';
import { listFacilitiesQuery } from './queries/list-facilities';

export * from './ports';
export { DEFAULT_PAGE_SIZE, type DirectoryDeps } from './deps';
export { directoryAudit, DIRECTORY_AUDIT_DETAIL_KEYS } from './audit';
export {
  MEMBER_DOCTOR_MIN_LETTERS,
  type AddMemberDoctorResult,
  type MemberDoctorCaller,
} from './internal/add-member-doctor';
export type { DoctorAtBranchVM } from './queries/doctors-at-branch';

export function createDirectoryModule(deps: DirectoryDeps) {
  return {
    getDoctor: getDoctorQuery(deps),
    listDoctors: listDoctorsQuery(deps),
    getFacility: getFacilityQuery(deps),
    listFacilities: listFacilitiesQuery(deps),
    doctorsAtBranch: doctorsAtBranchQuery(deps),
    facilitiesForDoctor: facilitiesForDoctorQuery(deps),
    /** Internal: U47's publish calls it on its own transaction (WF11). */
    addMemberDoctor: addMemberDoctorOperation(deps),
  };
}

export type DirectoryModule = ReturnType<typeof createDirectoryModule>;
