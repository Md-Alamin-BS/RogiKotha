// The release-1 evidence item transitions (U48 functional-spec § 4) as data, with the exact custody
// events each one appends (R-10). `sanitising`, `privacy_confirmed`, `published` and
// `original_expired` are never entered in release 1; `published` exists only on seeded rows.
import {
  EVIDENCE_ITEM_STATES,
  type EvidenceCustodyEvent,
  type EvidenceItemFailReason,
  type EvidenceItemState,
} from './states';

export type EvidenceTransitionEvent =
  | 'intake_committed'
  | 'job_started'
  | 'checks_passed'
  | 'retry_checks_passed'
  | 'check_failed'
  | 'scan_clean'
  | 'scan_found'
  | 'scan_unavailable'
  | 'scan_unavailable_last_attempt'
  | 'original_missing'
  | 'last_attempt_failed'
  | 'deadline_passed'
  | 'author_removed';

export type EvidenceOutboxEvent = 'evidence.received' | 'evidence.stateChanged';

export interface EvidenceTransition {
  /** `null` only for intake, which creates the item. */
  from: readonly EvidenceItemState[] | null;
  event: EvidenceTransitionEvent;
  to: EvidenceItemState;
  /** The reasons this row may record; empty when the target state carries none. */
  failReasons: readonly EvidenceItemFailReason[];
  custody: readonly EvidenceCustodyEvent[];
  outbox: EvidenceOutboxEvent | null;
}

const PROCESSING = ['quarantined', 'validating', 'scanning'] as const;
const CHECKED = ['validating', 'scanning'] as const;
const REMOVABLE = EVIDENCE_ITEM_STATES.filter((s) => s !== 'removed');

export const EVIDENCE_TRANSITIONS: readonly EvidenceTransition[] = [
  {
    from: null,
    event: 'intake_committed',
    to: 'quarantined',
    failReasons: [],
    custody: ['received'],
    outbox: 'evidence.received',
  },
  {
    from: ['quarantined'],
    event: 'job_started',
    to: 'validating',
    failReasons: [],
    custody: [],
    outbox: null,
  },
  {
    from: ['validating'],
    event: 'checks_passed',
    to: 'scanning',
    failReasons: [],
    custody: ['validated', 'scan_started'],
    outbox: null,
  },
  {
    from: ['scanning'],
    event: 'retry_checks_passed',
    to: 'scanning',
    failReasons: [],
    custody: ['scan_started'],
    outbox: null,
  },
  {
    from: CHECKED,
    event: 'check_failed',
    to: 'rejected',
    failReasons: ['type_mismatch', 'malformed', 'too_large'],
    custody: ['validation_failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: ['scanning'],
    event: 'scan_clean',
    to: 'preview_ready',
    failReasons: [],
    custody: ['scan_clean', 'preview_ready'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: ['scanning'],
    event: 'scan_found',
    to: 'rejected',
    failReasons: ['malware'],
    custody: ['scan_detected'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: ['scanning'],
    event: 'scan_unavailable',
    to: 'scanning',
    failReasons: [],
    custody: ['scan_unavailable'],
    outbox: null,
  },
  {
    from: ['scanning'],
    event: 'scan_unavailable_last_attempt',
    to: 'failed',
    failReasons: ['scanner_unavailable'],
    custody: ['scan_unavailable', 'failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: CHECKED,
    event: 'original_missing',
    to: 'failed',
    failReasons: ['unknown'],
    custody: ['failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: PROCESSING,
    event: 'last_attempt_failed',
    to: 'failed',
    failReasons: ['processing_timeout'],
    custody: ['failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: PROCESSING,
    event: 'deadline_passed',
    to: 'failed',
    failReasons: ['scanner_unavailable', 'processing_timeout'],
    custody: ['failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: REMOVABLE,
    event: 'author_removed',
    to: 'removed',
    failReasons: [],
    custody: ['removed'],
    outbox: 'evidence.stateChanged',
  },
];

/** The row for `event` when the item is in `from`, or `null` when the move is not allowed. */
export function findTransition(
  from: EvidenceItemState | null,
  event: EvidenceTransitionEvent,
): EvidenceTransition | null {
  return (
    EVIDENCE_TRANSITIONS.find(
      (t) =>
        t.event === event &&
        (t.from === null ? from === null : from !== null && t.from.includes(from)),
    ) ?? null
  );
}

export function canTransition(from: EvidenceItemState, to: EvidenceItemState): boolean {
  return EVIDENCE_TRANSITIONS.some((t) => t.to === to && t.from !== null && t.from.includes(from));
}

export type ScanOutcome = 'clean' | 'found' | 'unavailable';

export interface EvidenceStep {
  to: EvidenceItemState;
  failReason: EvidenceItemFailReason | null;
  custody: readonly EvidenceCustodyEvent[];
  outbox: EvidenceOutboxEvent | null;
}

function stepOf(event: EvidenceTransitionEvent): EvidenceStep {
  const row = EVIDENCE_TRANSITIONS.find((t) => t.event === event);
  if (row === undefined) throw new Error(`No evidence transition for ${event}`);
  return {
    to: row.to,
    failReason: row.failReasons[0] ?? null,
    custody: row.custody,
    outbox: row.outbox,
  };
}

/**
 * Where a scan reply moves an item in `scanning` (BR4.4, BR4.5). An unavailable scanner keeps the
 * item in `scanning` until the last attempt, which ends it `failed`/`scanner_unavailable`.
 */
export function nextOnScan(result: ScanOutcome, opts: { lastAttempt: boolean }): EvidenceStep {
  switch (result) {
    case 'clean':
      return stepOf('scan_clean');
    case 'found':
      return stepOf('scan_found');
    case 'unavailable':
      return stepOf(opts.lastAttempt ? 'scan_unavailable_last_attempt' : 'scan_unavailable');
  }
}

/** The fail reason the deadline records, from the item's latest custody event (BR4.11). */
export function sweepReason(
  latestCustody: EvidenceCustodyEvent | null,
): 'scanner_unavailable' | 'processing_timeout' {
  return latestCustody === 'scan_unavailable' ? 'scanner_unavailable' : 'processing_timeout';
}
