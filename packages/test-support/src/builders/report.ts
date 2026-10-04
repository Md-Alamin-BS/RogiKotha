// `aReport()` — validates directly against the real `report.file` command
// input (`FileReportInput`, contracts/schemas/moderation.ts).
import type { FileReportInput, ReportReason, TargetKind } from '@rogikotha/contracts';
import type { z } from 'zod';

import { seqId } from './seq.js';

export interface ReportBuild {
  targetKind: TargetKind;
  targetId: string;
  reason: ReportReason;
  detail: string;
  evidenceNote?: string;
}

export function aReport(overrides: Partial<ReportBuild> = {}): ReportBuild {
  const n = seqId('report');
  return {
    targetKind: 'comment',
    targetId: n,
    reason: 'spam',
    detail: 'Synthetic report for tests.',
    ...overrides,
  };
}

export function toFileReportInput(r: ReportBuild): z.infer<typeof FileReportInput> {
  return {
    targetKind: r.targetKind,
    targetId: r.targetId,
    reason: r.reason,
    detail: r.detail,
    ...(r.evidenceNote ? { evidenceNote: r.evidenceNote } : {}),
  };
}
