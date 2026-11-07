import type { EvidenceState } from '@rogikotha/contracts';

// ASSUMPTION(U48): the demo reads of reviews and doctors still count these states. The evidence
// module owns the public count now; U50 deletes this file with those demo reads.
export const DEMO_READY_EVIDENCE_STATES = [
  'preview_ready',
  'published',
] as const satisfies readonly EvidenceState[];
