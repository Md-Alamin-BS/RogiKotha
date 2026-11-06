import { describe, expect, it } from 'vitest';

import {
  COUNTING_STATES,
  EVIDENCE_ITEM_STATES,
  PROCESSING_STATES,
  PUBLIC_EVIDENCE_STATES,
  authorStatusOf,
  type AuthorEvidenceStatus,
  type EvidenceItemState,
} from './states';

const EXPECTED_AUTHOR_STATUS: Record<EvidenceItemState, AuthorEvidenceStatus | null> = {
  quarantined: 'pending',
  validating: 'pending',
  scanning: 'pending',
  sanitising: 'pending',
  preview_ready: 'ready',
  privacy_confirmed: 'pending',
  published: 'ready',
  failed: 'failed',
  rejected: 'rejected',
  removed: null,
  original_expired: null,
};

describe('PUBLIC_EVIDENCE_STATES', () => {
  it('is exactly preview_ready and published', () => {
    expect(PUBLIC_EVIDENCE_STATES).toEqual(['preview_ready', 'published']);
  });
});

describe('COUNTING_STATES', () => {
  it('counts processing and public items but not failed, rejected or removed ones', () => {
    expect([...COUNTING_STATES].sort()).toEqual(
      ['preview_ready', 'published', 'quarantined', 'scanning', 'validating'].sort(),
    );
    for (const state of ['failed', 'rejected', 'removed'] as const) {
      expect(COUNTING_STATES).not.toContain(state);
    }
  });

  it('holds every public and every processing state', () => {
    for (const state of [...PUBLIC_EVIDENCE_STATES, ...PROCESSING_STATES]) {
      expect(COUNTING_STATES).toContain(state);
    }
  });
});

describe('PROCESSING_STATES', () => {
  it('is the three states the job and the sweep may still move', () => {
    expect(PROCESSING_STATES).toEqual(['quarantined', 'validating', 'scanning']);
  });
});

describe('authorStatusOf', () => {
  it.each(EVIDENCE_ITEM_STATES.map((s) => [s, EXPECTED_AUTHOR_STATUS[s]] as const))(
    'reads %s as %s',
    (state, expected) => {
      expect(authorStatusOf(state)).toBe(expected);
    },
  );

  it('never lists a removed or expired item to its author', () => {
    expect(authorStatusOf('removed')).toBeNull();
    expect(authorStatusOf('original_expired')).toBeNull();
  });
});
