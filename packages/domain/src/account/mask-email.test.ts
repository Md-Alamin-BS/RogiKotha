import { describe, expect, it } from 'vitest';

import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('keeps the first character of the local part, then four stars and the domain', () => {
    expect(maskEmail('shirin.demo@example.test')).toBe('s****@example.test');
  });

  it('masks a one-character local part the same way', () => {
    expect(maskEmail('s@example.test')).toBe('s****@example.test');
  });

  it('hides a plus-addressed tag with the rest of the local part', () => {
    expect(maskEmail('shirin+news@example.test')).toBe('s****@example.test');
  });

  it('keeps a whole multi-code-point first grapheme, such as a Bengali letter with its vowel sign', () => {
    expect(maskEmail('কামাল@example.test')).toBe('কা****@example.test');
    expect(maskEmail('👩‍⚕️doc@example.test')).toBe('👩‍⚕️****@example.test');
    expect(maskEmail('émile@example.test')).toBe('é****@example.test');
  });

  it('never shows the length of the local part', () => {
    const short = maskEmail('ab@example.test');
    const long = maskEmail(`a${'b'.repeat(40)}@example.test`);
    expect(short).toBe(long);
  });

  it('splits on the last @ so the domain is never masked', () => {
    expect(maskEmail('"odd@local"@example.test')).toBe('"****@example.test');
  });

  it('refuses a value without a local part or a domain', () => {
    expect(() => maskEmail('example.test')).toThrow();
    expect(() => maskEmail('@example.test')).toThrow();
    expect(() => maskEmail('shirin@')).toThrow();
  });
});
