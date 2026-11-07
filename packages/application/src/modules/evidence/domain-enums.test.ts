// `domain` restates the evidence enums because it imports nothing (FD-093); this proves they equal
// the `@rogikotha/contracts` lists, at compile time and in order.
import {
  CUSTODY_EVENTS,
  EVIDENCE_FAIL_REASONS,
  EVIDENCE_STATES,
  type CustodyEvent,
  type EvidenceFailReason,
  type EvidenceState,
} from '@rogikotha/contracts';
import {
  EVIDENCE_CUSTODY_EVENTS,
  EVIDENCE_ITEM_FAIL_REASONS,
  EVIDENCE_ITEM_STATES,
  type EvidenceCustodyEvent,
  type EvidenceItemFailReason,
  type EvidenceItemState,
} from '@rogikotha/domain';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('evidence domain enums', () => {
  it('equal the contracts types', () => {
    expectTypeOf<EvidenceItemState>().toEqualTypeOf<EvidenceState>();
    expectTypeOf<EvidenceItemFailReason>().toEqualTypeOf<EvidenceFailReason>();
    expectTypeOf<EvidenceCustodyEvent>().toEqualTypeOf<CustodyEvent>();
  });

  it('list the same values in the same order as contracts', () => {
    expect(EVIDENCE_ITEM_STATES).toEqual(EVIDENCE_STATES);
    expect(EVIDENCE_ITEM_FAIL_REASONS).toEqual(EVIDENCE_FAIL_REASONS);
    expect(EVIDENCE_CUSTODY_EVENTS).toEqual(CUSTODY_EVENTS);
  });
});
