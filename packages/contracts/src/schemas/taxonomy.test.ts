import { describe, expect, it } from 'vitest';

import { CreateProvisionalInput, ResolveInput, TERM_TEXT_MAX } from './taxonomy';

describe('ResolveInput', () => {
  it('accepts a wording with or without a term kind', () => {
    expect(ResolveInput.safeParse({ text: 'sugar' }).success).toBe(true);
    expect(ResolveInput.safeParse({ text: 'sugar', kind: 'condition' }).success).toBe(true);
  });

  it('refuses an empty wording, an unknown kind and one over the limit', () => {
    expect(ResolveInput.safeParse({ text: '' }).success).toBe(false);
    expect(ResolveInput.safeParse({ text: 'sugar', kind: 'rating' }).success).toBe(false);
    expect(ResolveInput.safeParse({ text: 'x'.repeat(TERM_TEXT_MAX + 1) }).success).toBe(false);
  });
});

describe('CreateProvisionalInput', () => {
  it('trims the wording and refuses one that is only spaces', () => {
    const parsed = CreateProvisionalInput.safeParse({
      kind: 'condition',
      text: '  হাইপোথাইরয়েড ',
      lang: 'bn',
    });
    expect(parsed.success && parsed.data.text).toBe('হাইপোথাইরয়েড');
    expect(
      CreateProvisionalInput.safeParse({ kind: 'condition', text: '   ', lang: 'bn' }).success,
    ).toBe(false);
  });
});
