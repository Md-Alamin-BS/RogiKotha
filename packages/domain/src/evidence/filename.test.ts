import { describe, expect, it } from 'vitest';

import { EVIDENCE_FILENAME_MAX_CHARS, cleanFilename } from './filename';

describe('cleanFilename', () => {
  it('keeps only the last segment of a relative path', () => {
    expect(cleanFilename('../../a.png')).toBe('a.png');
  });

  it('keeps only the last segment of a Windows path', () => {
    expect(cleanFilename('C:\\Users\\x\\scan.PNG')).toBe('scan.PNG');
  });

  it('removes control characters and trims the result', () => {
    expect(cleanFilename('  re\u0000port\u001f\u007f.jpg\n ')).toBe('report.jpg');
  });

  it('cuts a 300-character name to 200 characters', () => {
    const cleaned = cleanFilename(`${'a'.repeat(296)}.png`);
    expect(cleaned).toHaveLength(EVIDENCE_FILENAME_MAX_CHARS);
    expect(cleaned).toBe('a'.repeat(200));
  });

  it('cuts by character, so a Bengali or emoji name is never split inside a character', () => {
    const cleaned = cleanFilename('😀'.repeat(250));
    expect(Array.from(cleaned ?? '')).toHaveLength(200);
    expect(cleanFilename('রিপোর্ট.jpg')).toBe('রিপোর্ট.jpg');
  });

  it('answers null for an empty name, a bare folder path or only control characters', () => {
    expect(cleanFilename('')).toBeNull();
    expect(cleanFilename('   ')).toBeNull();
    expect(cleanFilename('folder/')).toBeNull();
    expect(cleanFilename('\u0001\u0002')).toBeNull();
  });
});
