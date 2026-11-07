import { describe, expect, it } from 'vitest';

import { EVIDENCE_ITEM_STATES, type EvidenceItemState } from './states';
import {
  EVIDENCE_TRANSITIONS,
  canTransition,
  findTransition,
  nextOnScan,
  sweepReason,
  type EvidenceTransition,
} from './transitions';

// The § 4 table of the U48 functional spec, written out again so a change to the data shows here.
const SPEC_ROWS: readonly EvidenceTransition[] = [
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
    from: ['validating', 'scanning'],
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
    from: ['validating', 'scanning'],
    event: 'original_missing',
    to: 'failed',
    failReasons: ['unknown'],
    custody: ['failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: ['quarantined', 'validating', 'scanning'],
    event: 'last_attempt_failed',
    to: 'failed',
    failReasons: ['processing_timeout'],
    custody: ['failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: ['quarantined', 'validating', 'scanning'],
    event: 'deadline_passed',
    to: 'failed',
    failReasons: ['scanner_unavailable', 'processing_timeout'],
    custody: ['failed'],
    outbox: 'evidence.stateChanged',
  },
  {
    from: EVIDENCE_ITEM_STATES.filter((s) => s !== 'removed'),
    event: 'author_removed',
    to: 'removed',
    failReasons: [],
    custody: ['removed'],
    outbox: 'evidence.stateChanged',
  },
];

const ALLOWED = new Set(
  SPEC_ROWS.flatMap((row) => (row.from ?? []).map((from) => `${from}->${row.to}`)),
);

describe('EVIDENCE_TRANSITIONS', () => {
  it('has exactly the rows of the § 4 table', () => {
    expect(EVIDENCE_TRANSITIONS.map((t) => t.event)).toEqual(SPEC_ROWS.map((t) => t.event));
  });

  it.each(SPEC_ROWS.map((row) => [row.event, row] as const))(
    '%s: from, to, fail reasons, exact custody and outbox match the table',
    (event, row) => {
      const actual = EVIDENCE_TRANSITIONS.find((t) => t.event === event);
      expect(actual).toBeDefined();
      expect(actual?.from === null ? null : [...(actual?.from ?? [])].sort()).toEqual(
        row.from === null ? null : [...row.from].sort(),
      );
      expect(actual?.to).toBe(row.to);
      expect(actual?.failReasons).toEqual(row.failReasons);
      expect(actual?.custody).toEqual(row.custody);
      expect(actual?.outbox).toBe(row.outbox);
    },
  );

  it.each(
    SPEC_ROWS.filter((r) => r.from !== null).flatMap((r) =>
      (r.from ?? []).map((f) => [r.event, f] as const),
    ),
  )('findTransition finds %s from %s', (event, from) => {
    expect(findTransition(from, event)?.event).toBe(event);
  });

  it('creates an item only at intake, with no earlier state', () => {
    expect(findTransition(null, 'intake_committed')?.to).toBe('quarantined');
    expect(findTransition('quarantined', 'intake_committed')).toBeNull();
    expect(findTransition(null, 'job_started')).toBeNull();
  });

  it('refuses an event from a state its row does not list', () => {
    expect(findTransition('preview_ready', 'scan_clean')).toBeNull();
    expect(findTransition('quarantined', 'checks_passed')).toBeNull();
    expect(findTransition('quarantined', 'original_missing')).toBeNull();
    expect(findTransition('validating', 'scan_found')).toBeNull();
    expect(findTransition('removed', 'author_removed')).toBeNull();
  });
});

describe('canTransition', () => {
  const pairs = EVIDENCE_ITEM_STATES.flatMap((from) =>
    EVIDENCE_ITEM_STATES.map((to) => [from, to] as [EvidenceItemState, EvidenceItemState]),
  );

  it.each(pairs.filter(([f, t]) => ALLOWED.has(`${f}->${t}`)))('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('refuses every pair the table does not list', () => {
    const refused = pairs.filter(([f, t]) => !ALLOWED.has(`${f}->${t}`));
    expect(refused.length).toBeGreaterThan(0);
    for (const [from, to] of refused) {
      expect({ from, to, allowed: canTransition(from, to) }).toEqual({ from, to, allowed: false });
    }
  });

  it('never moves an item backwards', () => {
    expect(canTransition('scanning', 'validating')).toBe(false);
    expect(canTransition('validating', 'quarantined')).toBe(false);
    expect(canTransition('preview_ready', 'scanning')).toBe(false);
    expect(canTransition('failed', 'scanning')).toBe(false);
  });

  it('reaches removed from every state but removed', () => {
    for (const from of EVIDENCE_ITEM_STATES) {
      expect(canTransition(from, 'removed')).toBe(from !== 'removed');
    }
  });

  it.each(['sanitising', 'privacy_confirmed', 'original_expired', 'published'] as const)(
    'never enters %s in release 1',
    (to) => {
      for (const from of EVIDENCE_ITEM_STATES) expect(canTransition(from, to)).toBe(false);
      expect(EVIDENCE_TRANSITIONS.some((t) => t.to === to)).toBe(false);
    },
  );
});

describe('nextOnScan', () => {
  it('moves a clean scan to preview_ready with scan_clean then preview_ready', () => {
    expect(nextOnScan('clean', { lastAttempt: false })).toEqual({
      to: 'preview_ready',
      failReason: null,
      custody: ['scan_clean', 'preview_ready'],
      outbox: 'evidence.stateChanged',
    });
  });

  it('rejects a detection as malware, on any attempt', () => {
    for (const lastAttempt of [false, true]) {
      expect(nextOnScan('found', { lastAttempt })).toEqual({
        to: 'rejected',
        failReason: 'malware',
        custody: ['scan_detected'],
        outbox: 'evidence.stateChanged',
      });
    }
  });

  it('keeps an unavailable scan in scanning while attempts are left, with no outbox event', () => {
    expect(nextOnScan('unavailable', { lastAttempt: false })).toEqual({
      to: 'scanning',
      failReason: null,
      custody: ['scan_unavailable'],
      outbox: null,
    });
  });

  it('fails an unavailable scan on the last attempt as scanner_unavailable', () => {
    expect(nextOnScan('unavailable', { lastAttempt: true })).toEqual({
      to: 'failed',
      failReason: 'scanner_unavailable',
      custody: ['scan_unavailable', 'failed'],
      outbox: 'evidence.stateChanged',
    });
  });

  it('never advances an unavailable scan to a public state', () => {
    for (const lastAttempt of [false, true]) {
      expect(['preview_ready', 'published']).not.toContain(
        nextOnScan('unavailable', { lastAttempt }).to,
      );
    }
  });
});

describe('sweepReason', () => {
  it('records scanner_unavailable when the latest custody event is scan_unavailable', () => {
    expect(sweepReason('scan_unavailable')).toBe('scanner_unavailable');
  });

  it.each(['received', 'validated', 'scan_started', null] as const)(
    'records processing_timeout after %s',
    (latest) => {
      expect(sweepReason(latest)).toBe('processing_timeout');
    },
  );
});
