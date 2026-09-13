// Replaces: `renderEvidence` (staff evidence quarantine + hold/retention
// controls), admin/app.js. Maps from RK.moderation.quarantine (stage,
// stages, note, failClosed).
//
// TODO(T-407): owner refines every field below against the ported
// component; whether staff ever see the original filename (vs. a
// server-generated label) is this task's call against 01-conventions.md §4
// ("original filename is private metadata only").
import type { CustodyEvent, EvidenceFailReason, EvidenceState } from '../enums.js';

export interface QuarantineStageVM {
  event: CustodyEvent;
  status: 'ok' | 'fail' | 'hold' | 'wait' | 'pending';
}

export interface QuarantineItemVM {
  itemId: string;
  reviewPublicId: string;
  state: EvidenceState;
  failReason?: EvidenceFailReason;
  stages: QuarantineStageVM[];
  note?: string;
  retentionExpiresAt?: string;
  holdId?: string;
}

export interface QuarantineVM {
  items: QuarantineItemVM[];
  nextCursor?: string;
}
