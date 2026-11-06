import { describe, expect, it, vi } from 'vitest';
import { notFound } from 'next/navigation';

// Next's notFound() never returns: it throws a control-flow error. The stand-in does the same.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import UnmatchedPatientPath from './page';

describe('unmatched patient path', () => {
  it('hands the request to the patient 404', () => {
    expect(() => UnmatchedPatientPath()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
