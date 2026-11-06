// `directory.addMemberDoctor` (WF11, C7 release-1 addition, FD-100): the doctor a member types in
// the composer, reused when one already matches, else created at once and marked "not confirmed"
// while its submission is pending (BR2.13). An internal operation with no route: U47's publish
// calls it on its own transaction, after checking the member is verified and not restricted, and
// passes its publishing persona as the audit actor so an anonymous review names no account.
import {
  AddMemberDoctorInput,
  doctorNameKey,
  doctorNameLetterCount,
  err,
  hasControlOrFormat,
  ok,
  parseInput,
  type Result,
} from '@rogikotha/contracts';

import type { AuditActor, Tx } from '../../../ports';
import { directoryAudit } from '../audit';
import type { DirectoryDeps } from '../deps';

/** A usable name has at least three letters once a title is removed (BR5.5). */
export const MEMBER_DOCTOR_MIN_LETTERS = 3;

export interface MemberDoctorCaller {
  /** The submitter on the pending submission; never projected (FD-100, ISS-398). */
  accountId: string;
  /** Who the audit row names: the caller's persona inside a publish (BR5.8). */
  actor: AuditActor;
  correlationId: string;
}

export interface AddMemberDoctorResult {
  doctorId: string;
  reused: boolean;
}

function invalid(field: string, correlationId: string): Result<never> {
  return err('validation', {
    correlationId,
    fieldErrors: { [field]: 'errors.common.validation' },
  });
}

export function addMemberDoctorOperation(deps: DirectoryDeps) {
  return async function addMemberDoctor(
    tx: Tx,
    raw: unknown,
    caller: MemberDoctorCaller,
  ): Promise<Result<AddMemberDoctorResult>> {
    const parsed = parseInput(AddMemberDoctorInput, raw, { correlationId: caller.correlationId });
    if (!parsed.ok) return parsed;
    const input = parsed.data;
    // Checked before collapsing spaces: `\s` also matches U+FEFF, an invisible format character.
    if (hasControlOrFormat(input.name)) return invalid('name', caller.correlationId);
    const name = input.name.replace(/\s+/g, ' ');
    if (doctorNameLetterCount(name) < MEMBER_DOCTOR_MIN_LETTERS) {
      return invalid('name', caller.correlationId);
    }
    const specialtyId = input.specialtyId ?? null;
    if (specialtyId !== null && !(await deps.directory.isPublishedSpecialty(tx, specialtyId))) {
      return invalid('specialtyId', caller.correlationId);
    }

    const key = doctorNameKey(name);
    // Two members adding one name at once must not create two profiles (BR5.6).
    await deps.directory.lockDoctorNameKey(tx, key);
    const candidates = await deps.directory.findVisibleDoctorsByNameKey(tx, key);
    // Same names are common, so a different specialty means a different doctor.
    const reuse = candidates.find(
      (c) => specialtyId === null || c.specialtyId === null || c.specialtyId === specialtyId,
    );
    if (reuse) return ok({ doctorId: reuse.id, reused: true });

    const doctorId = deps.ids.newId();
    const practiceArea = input.practiceArea ?? null;
    await deps.directory.insertMemberDoctor(tx, {
      id: doctorId,
      publicId: deps.ids.newPublicId(),
      name,
      nameKey: key,
      specialtyId,
      practiceArea,
      bmdcNumber: input.bmdcNumber ?? null,
      submittedByAccountId: caller.accountId,
      now: deps.clock.now(),
    });
    await deps.audit.write(
      tx,
      directoryAudit.memberAdded(
        doctorId,
        { hasSpecialty: specialtyId !== null, hasChamber: practiceArea !== null },
        caller.actor,
      ),
    );
    await deps.outbox.append(tx, 'doctor.changed', { id: doctorId });
    return ok({ doctorId, reused: false });
  };
}
