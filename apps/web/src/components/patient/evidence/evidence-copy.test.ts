import { describe, expect, it } from 'vitest';

import { loadEvidenceMessages } from './evidence-test-support';

// BR5.4: no evidence copy calls a file verified or approved. The word "যাচাই" (check) is allowed:
// the required wording itself uses it.
const FORBIDDEN = {
  en: /verified|approved/i,
  bn: /যাচাইকৃত|অনুমোদিত/,
} as const;

function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => leaves(value, `${path}.${key}`));
}

describe.each(['en', 'bn'] as const)('evidence copy (%s)', (locale) => {
  const messages = loadEvidenceMessages(locale);
  const copy = [...leaves(messages.ev, 'ev'), ...leaves(messages.evidence, 'evidence')];

  it('has the ev.* and evidence.* keys to check', () => {
    expect(copy.length).toBeGreaterThan(30);
  });

  it('never describes a file as verified or approved', () => {
    const offenders = copy.filter(([, value]) => FORBIDDEN[locale].test(value)).map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it('keeps the required public wording', () => {
    expect(messages.evidence).toMatchObject({
      status:
        locale === 'en'
          ? 'Documents attached — not medically validated'
          : 'কাগজপত্র যুক্ত — চিকিৎসাগতভাবে যাচাই করা হয়নি',
    });
  });
});
