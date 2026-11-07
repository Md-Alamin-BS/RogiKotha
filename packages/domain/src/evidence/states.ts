// Evidence item states and how they read to the public and to the author (BR5.1, BR6.1, C17).
// `domain` imports nothing (FD-093), so the enum lists are restated here; `application` proves at
// compile time that they equal `EVIDENCE_STATES`, `EVIDENCE_FAIL_REASONS` and `CUSTODY_EVENTS` in
// `@rogikotha/contracts`.

export const EVIDENCE_ITEM_STATES = [
  'quarantined',
  'validating',
  'scanning',
  'sanitising',
  'preview_ready',
  'privacy_confirmed',
  'published',
  'failed',
  'rejected',
  'removed',
  'original_expired',
] as const;
export type EvidenceItemState = (typeof EVIDENCE_ITEM_STATES)[number];

export const EVIDENCE_ITEM_FAIL_REASONS = [
  'type_mismatch',
  'too_large',
  'malformed',
  'malware',
  'scanner_unavailable',
  'processing_timeout',
  'unknown',
  'too_many_pages',
  'encrypted',
] as const;
export type EvidenceItemFailReason = (typeof EVIDENCE_ITEM_FAIL_REASONS)[number];

export const EVIDENCE_CUSTODY_EVENTS = [
  'received',
  'validated',
  'validation_failed',
  'scan_started',
  'scan_clean',
  'scan_detected',
  'scan_unavailable',
  'sanitised',
  'preview_ready',
  'redaction_applied',
  'privacy_confirmed',
  'published',
  'failed',
  'original_accessed',
  'hold_placed',
  'hold_released',
  'retention_changed',
  'original_expired',
  'removed',
] as const;
export type EvidenceCustodyEvent = (typeof EVIDENCE_CUSTODY_EVENTS)[number];

/** The release-1 clean end state plus the seeded corpus's published items (BR5.1, C17). */
export const PUBLIC_EVIDENCE_STATES = [
  'preview_ready',
  'published',
] as const satisfies readonly EvidenceItemState[];

/** States that take one of a review's slots and count towards its total size (BR2.3, BR2.4). */
export const COUNTING_STATES = [
  'quarantined',
  'validating',
  'scanning',
  'preview_ready',
  'published',
] as const satisfies readonly EvidenceItemState[];

/** States the worker's job and the sweep may still move (BR4.9, BR4.11). */
export const PROCESSING_STATES = [
  'quarantined',
  'validating',
  'scanning',
] as const satisfies readonly EvidenceItemState[];

export type AuthorEvidenceStatus = 'pending' | 'ready' | 'rejected' | 'failed';

/** What the author sees for one item, or `null` when the item is not listed (BR6.1). */
export function authorStatusOf(state: EvidenceItemState): AuthorEvidenceStatus | null {
  switch (state) {
    case 'quarantined':
    case 'validating':
    case 'scanning':
      return 'pending';
    case 'preview_ready':
    case 'published':
      return 'ready';
    case 'rejected':
      return 'rejected';
    case 'failed':
      return 'failed';
    case 'removed':
    case 'original_expired':
      return null;
    // ASSUMPTION(U48): BR6.1 does not map the release-2 states; they are still processing, so they
    // read "Being checked" and keep no time promise.
    case 'sanitising':
    case 'privacy_confirmed':
      return 'pending';
  }
}
