// Replaces: `caseDetail`/`auditTimeline` (staff case tray), admin/app.js.
// Maps from RK.moderation.cases and RK.moderation.auditLog — reporter
// identity never appears here (01-conventions.md §5): the console always
// reads "restricted".
//
// Release 2 (T-406): owner refines every field below against the ported
// component.
import type { CaseStatus, ModerationAction, ModerationLane, ReportReason } from '../enums';

export interface CaseDecisionVM {
  action: ModerationAction;
  reasonCode: string;
  reasonToAuthor: string;
  createdAt: string;
}

export interface AuditTimelineEntryVM {
  /** free string per 02-data-model.md §9 `audit_events.action` — not the `ModerationAction` enum */
  action: string;
  /** opaque, e.g. `moderator:rashid`, `system:auto` */
  actor: string;
  createdAt: string;
}

export interface CaseTrayVM {
  code: string;
  lane: ModerationLane;
  status: CaseStatus;
  summary: string;
  note?: string;
  reasons: ReportReason[];
  coordinatedSignal: boolean;
  targetExcerpt: string;
  /** never a real identity — the console always reads "restricted" */
  reporter: 'restricted';
  evidenceGateState?: string;
  decisions: CaseDecisionVM[];
  /** last 10 */
  auditTimeline: AuditTimelineEntryVM[];
}
