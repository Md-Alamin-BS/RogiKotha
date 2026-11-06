import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_ATTEMPT_BUDGET_MS,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MAX_PER_REVIEW,
  EVIDENCE_MAX_TOTAL_BYTES,
  EVIDENCE_PROCESSING_DEADLINE_SEC,
  EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP,
  EVIDENCE_UPLOAD_LIMIT,
  EVIDENCE_UPLOAD_WINDOW_SEC,
} from './limits';

describe('evidence limits', () => {
  it('holds the C18 values: 15 MB per file, 10 files and 100 MB per review', () => {
    expect(EVIDENCE_MAX_FILE_BYTES).toBe(15 * 1024 * 1024);
    expect(EVIDENCE_MAX_PER_REVIEW).toBe(10);
    expect(EVIDENCE_MAX_TOTAL_BYTES).toBe(100 * 1024 * 1024);
  });

  it('allows 30 uploads per account per hour', () => {
    expect(EVIDENCE_UPLOAD_LIMIT).toBe(30);
    expect(EVIDENCE_UPLOAD_WINDOW_SEC).toBe(3600);
  });

  it('bounds an attempt at 120 s, below the 300 s queue expiry, and the item at one hour', () => {
    expect(EVIDENCE_ATTEMPT_BUDGET_MS).toBe(120_000);
    expect(EVIDENCE_ATTEMPT_BUDGET_MS).toBeLessThan(300_000);
    expect(EVIDENCE_PROCESSING_DEADLINE_SEC).toBe(3600);
  });

  it('caps the request body at one file plus 64 KiB of multipart envelope', () => {
    expect(EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP).toBe(EVIDENCE_MAX_FILE_BYTES + 65_536);
  });

  it('lets the total be reached before the count, so total_too_large stays reachable', () => {
    expect(EVIDENCE_MAX_FILE_BYTES * EVIDENCE_MAX_PER_REVIEW).toBeGreaterThan(
      EVIDENCE_MAX_TOTAL_BYTES,
    );
  });
});
