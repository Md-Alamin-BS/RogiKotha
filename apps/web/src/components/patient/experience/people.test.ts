import { describe, expect, it } from 'vitest';

import { bylineIdentity, dhakaIsoDate, dhakaMonthYear, initials, paragraphs } from './people';

describe('experience people helpers', () => {
  it('maps each identity mode to the byline vocabulary of the prototype', () => {
    expect(bylineIdentity('named')).toBe('real');
    expect(bylineIdentity('pseudonymous')).toBe('pseudo');
    expect(bylineIdentity('anonymous')).toBe('anon');
  });

  it('takes the first and last initial of a real name, without a title', () => {
    expect(initials('Dr. Rina Akter Begum', 'real')).toBe('RB');
    expect(initials('Rina', 'real')).toBe('R');
  });

  it('marks a username with an at sign and its first letter', () => {
    expect(initials('quiet_reader', 'pseudo')).toBe('@q');
  });

  it('reads dates in Bangladesh time, so a late evening is still the same day there', () => {
    const lateEveningUtc = new Date('2026-03-31T20:30:00Z');
    expect(dhakaIsoDate(lateEveningUtc)).toBe('2026-04-01');
    expect(dhakaMonthYear(lateEveningUtc)).toEqual({ year: 2026, month: 4 });
  });

  it('splits a body into paragraphs at blank lines and drops empty ones', () => {
    expect(paragraphs('One.\n\n  Two.  \n\n\n')).toEqual(['One.', 'Two.']);
    expect(paragraphs(null)).toEqual([]);
  });
});
