// Release-1 evidence limits (ENT-006, C18 values, Q1 answer B). Each is read in one place, so
// release 2 can swap it for a ConfigProvider key.

/** 15 MB per file (C18, AC7.1.3, BR2.2). */
export const EVIDENCE_MAX_FILE_BYTES = 15_728_640;
/** Items in `COUNTING_STATES` per review (C18, AC7.1.3, BR2.3). */
export const EVIDENCE_MAX_PER_REVIEW = 10;
/** 100 MB per review; can be the first limit hit (BR2.4). */
export const EVIDENCE_MAX_TOTAL_BYTES = 104_857_600;
/** Upload requests per account per window (BR2.7). */
export const EVIDENCE_UPLOAD_LIMIT = 30;
export const EVIDENCE_UPLOAD_WINDOW_SEC = 3600;
/** The handler's own bound per attempt; pg-boss's 300 s expiry only catches a hung worker (BR4.6). */
export const EVIDENCE_ATTEMPT_BUDGET_MS = 120_000;
/** Counted from `createdAt`; past it the job or the sweep fails the item (BR4.9, BR4.11). */
export const EVIDENCE_PROCESSING_DEADLINE_SEC = 3600;
/** One file plus room for the multipart envelope. */
export const EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP = EVIDENCE_MAX_FILE_BYTES + 65_536;
