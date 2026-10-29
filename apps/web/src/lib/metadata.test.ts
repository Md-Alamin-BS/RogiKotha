import { describe, expect, it } from 'vitest';
import { noindex } from './metadata';

describe('noindex', () => {
  it('asks search engines not to index the page', () => {
    expect(noindex()).toEqual({ robots: { index: false } });
  });
});
