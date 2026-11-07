// `@rogikotha/application/worker`: the worker's only value entry (FD-093 (2), BR8.6). It carries
// the `mail.send` use case and nothing from `modules/account`, `modules/identity` or
// `modules/data-requests/commands`; `worker-subpath.test.ts` walks its import graph to prove it.
export {
  MAIL_SEND_MAX_ATTEMPTS,
  sendEmailDelivery,
  type SendEmailDeliveryDeps,
  type SendEmailDeliveryOutcome,
} from './modules/notification/send-email-delivery';
export { emailCatalogFromMessages } from './modules/notification/email-catalog';
export { MAIL_SEND_JOB, type MailSendPayload } from './ports/job-queue';
export {
  EvidenceAttemptAborted,
  ScannerUnavailable,
} from './modules/evidence/jobs/process-evidence';
export {
  createProcessEvidence,
  type ProcessEvidenceInput,
  type ProcessEvidenceResult,
} from './modules/evidence/jobs/process-evidence';
export {
  createSweepEvidence,
  type SweepEvidenceResult,
} from './modules/evidence/jobs/sweep-evidence';
export type { EvidenceProcessorDeps, EvidenceSweepDeps } from './modules/evidence/worker-ports';
