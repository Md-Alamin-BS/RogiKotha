// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// next-intl's middleware imports `next/server` by a path that does not resolve under Vitest, so
// it is replaced by a stand-in that records the request the proxy hands on. The locale
// negotiation itself belongs to next-intl and is not under test here.
const handedOn = vi.hoisted(() => ({ request: undefined as NextRequest | undefined }));
vi.mock('next-intl/middleware', () => ({
  default: () => (request: NextRequest) => {
    handedOn.request = request;
    return new Response(null, { status: 204 });
  },
}));
vi.mock('./i18n/routing', () => ({ routing: {} }));

import proxy, { config } from './proxy';

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

describe('proxy', () => {
  beforeEach(() => {
    handedOn.request = undefined;
  });

  it('stamps the request pathname on the headers the layouts read', () => {
    proxy(request('/bn/admin/queue'));
    expect(handedOn.request?.headers.get('x-pathname')).toBe('/bn/admin/queue');
  });

  it('keeps the headers the browser sent', () => {
    proxy(request('/en/doctors', { 'accept-language': 'bn' }));
    expect(handedOn.request?.headers.get('accept-language')).toBe('bn');
    expect(handedOn.request?.headers.get('x-pathname')).toBe('/en/doctors');
  });

  it('overwrites a pathname header the browser tried to supply', () => {
    proxy(request('/en/doctors', { 'x-pathname': '/en/admin/queue' }));
    expect(handedOn.request?.headers.get('x-pathname')).toBe('/en/doctors');
  });

  it('returns what the locale middleware returns', () => {
    expect(proxy(request('/en')).status).toBe(204);
  });
});

describe('proxy matcher', () => {
  const [pattern] = config.matcher;
  const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);

  it('covers page paths', () => {
    expect(matches('/en/doctors')).toBe(true);
  });

  it.each(['/api/health', '/_next/static/chunk.js', '/favicon.ico'])('skips %s', (path) => {
    expect(matches(path)).toBe(false);
  });
});
