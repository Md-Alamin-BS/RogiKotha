import { describe, expect, it } from 'vitest';

import { prototypeHash, stableHue } from './ids';

// Values produced by the prototype's own hash() (ui-design-prototype/shared/rogikotha-data.js
// 2455-2462) for these texts; its double multiply differs from Math.imul for every one of them.
const PROTOTYPE_HASHES: [string, number][] = [
  ['d1', 2333939871],
  ['f1', 354578187],
  ['a1b2c3d4e5', 651719268],
  ['0123456789', 3575284024],
  ['zzzzzzzzzz', 2775870518],
];

describe('stableHue', () => {
  it.each(PROTOTYPE_HASHES)('hashes %s exactly as the prototype does', (text, expected) => {
    expect(prototypeHash(text)).toBe(expected);
  });

  it.each(PROTOTYPE_HASHES)('gives %s the prototype hash modulo 360', (text, expected) => {
    expect(stableHue(text)).toBe(expected % 360);
  });

  it('always gives the same hue in 0..359 for one public id', () => {
    const hue = stableHue('a1b2c3d4e5');
    expect(stableHue('a1b2c3d4e5')).toBe(hue);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});
