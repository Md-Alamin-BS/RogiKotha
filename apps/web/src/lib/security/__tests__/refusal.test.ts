// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { errorMessageKey } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import type { RefusalKind } from '../origin';
import { REFUSAL_MESSAGE_KEYS, refusalResponse, type RefusalReason } from '../refusal';

function dictionary(locale: 'en' | 'bn'): Record<string, unknown> {
  const file = fileURLToPath(
    new URL(`../../../../../../packages/i18n/messages/${locale}.json`, import.meta.url),
  );
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function lookup(messages: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    return node !== null && typeof node === 'object'
      ? (node as Record<string, unknown>)[part]
      : undefined;
  }, messages);
}

const ORIGIN_KINDS: RefusalKind[] = [
  'host',
  'forwarded_host',
  'origin',
  'origin_null',
  'origin_missing',
];

describe('refusalResponse (BR3.6, ENT-009)', () => {
  it.each(ORIGIN_KINDS)(
    'answers the proxy form of %s with 403, no body and no-store',
    async (kind) => {
      const response = refusalResponse(kind);

      expect(response.status).toBe(403);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toBe('');
    },
  );

  it('answers the proxy form of invalid settings with 500 and no body', async () => {
    const response = refusalResponse('settings_invalid');

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('');
  });

  it.each<[RefusalReason, number, string]>([
    ['host', 403, 'forbidden'],
    ['forwarded_host', 403, 'forbidden'],
    ['origin', 403, 'forbidden'],
    ['origin_null', 403, 'forbidden'],
    ['origin_missing', 403, 'forbidden'],
    ['length_invalid', 400, 'validation'],
    ['too_large', 413, 'evidence.too_large'],
    ['settings_invalid', 500, 'internal'],
  ])('answers the route form of %s with %i and the AppError %s', async (reason, status, code) => {
    const response = refusalResponse(reason, 'corr-u41-1');

    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({
      code,
      messageKey: errorMessageKey(code as Parameters<typeof errorMessageKey>[0]),
      correlationId: 'corr-u41-1',
    });
  });

  it('closes the connection only for a refused body length (BR4.2)', () => {
    expect(refusalResponse('too_large', 'c').headers.get('connection')).toBe('close');
    expect(refusalResponse('length_invalid', 'c').headers.get('connection')).toBe('close');
    expect(refusalResponse('origin', 'c').headers.get('connection')).toBeNull();
  });

  it("uses the upload route's own key for too_large when it passes one", async () => {
    const body = (await refusalResponse('too_large', 'c', 'errors.evidence.tooLarge').json()) as {
      messageKey: string;
    };

    expect(body.messageKey).toBe('errors.evidence.tooLarge');
  });

  it('never echoes a request value in the body', async () => {
    const text = await refusalResponse('host', 'corr-u41-2').text();

    expect(text).not.toMatch(/evil|localhost|http/);
  });

  it.each(['en', 'bn'] as const)('finds every refusal message key in %s.json', (locale) => {
    const messages = dictionary(locale);
    const keys = [...Object.values(REFUSAL_MESSAGE_KEYS), errorMessageKey('evidence.too_large')];

    for (const key of keys) {
      expect(typeof lookup(messages, key), key).toBe('string');
    }
    expect(REFUSAL_MESSAGE_KEYS).toEqual({
      forbidden: errorMessageKey('forbidden'),
      validation: errorMessageKey('validation'),
      internal: errorMessageKey('internal'),
    });
  });
});
