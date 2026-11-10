// Replaces: `renderQueue`/`queueBody` (staff moderation queue), admin/app.js.
// Maps from RK.moderation.cases (lane, ageHours, reports, autoHidden,
// coordinated, reasons, targetKind).
//
// Release 2 (T-406): owner refines every field below against the ported
// component.
import type { ModerationLane, ReportReason, TargetKind } from '../enums';

export interface QueueCaseVM {
  code: string;
  lane: ModerationLane;
  ageHours: number;
  reportCount: number;
  autoHidden: boolean;
  coordinatedSignal: boolean;
  reasons: ReportReason[];
  slaDueAt: string;
  targetKind: TargetKind;
}

export interface QueueLaneVM {
  lane: ModerationLane;
  cases: QueueCaseVM[];
}

export interface QueueVM {
  lanes: QueueLaneVM[];
}
