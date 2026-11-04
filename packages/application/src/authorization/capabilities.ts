// What an Actor may do as staff. T-101 gives no account any capability, super_admin included:
// staff powers from a password alone, with no approved device, would let the patient sign-in act
// as staff (T-103 F2, BR4.3).
import type { Capability, StaffRole } from '@rogikotha/contracts';

/** TODO(T-103): resolve the role's capabilities behind the approved-device gate. */
export function capabilitiesFor(_staffRole: StaffRole | null): Capability[] {
  void _staffRole;
  return [];
}
