import { describe, expect, it } from 'vitest';

import { buildEmailCatalog } from './email-catalog.js';

const T101_EMAIL_KEYS = [
  'email.verify',
  'email.reset',
  'email.existing',
  'email.security.passwordChanged',
  'email.security.severeSignInActivity',
];

describe('email catalog from the i18n message files (FD-098)', () => {
  it('holds every T-101 email in both languages, each with one link placeholder', () => {
    const catalog = buildEmailCatalog();

    for (const locale of ['en', 'bn'] as const) {
      for (const key of T101_EMAIL_KEYS) {
        const template = catalog[locale][key];
        expect(template, `${locale} ${key}`).toBeDefined();
        expect(template?.subject.trim(), `${locale} ${key} subject`).not.toBe('');
        expect(template?.body.match(/\{link\}/g), `${locale} ${key} body`).toHaveLength(1);
      }
    }
  });

  it('keeps Bengali copy in bn and English copy in en', () => {
    const catalog = buildEmailCatalog();

    expect(catalog.bn['email.security.severeSignInActivity']?.subject).toMatch(/[ঀ-৿]/);
    expect(catalog.en['email.security.severeSignInActivity']?.subject).not.toMatch(/[ঀ-৿]/);
  });
});
