import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(requestHeaders.current),
}));

import { readNonce } from '../nonce';

describe('readNonce (BR1.5)', () => {
  beforeEach(() => {
    requestHeaders.current = new Headers();
  });

  it("returns the nonce the proxy set on the request's x-nonce header", async () => {
    requestHeaders.current = new Headers({ 'x-nonce': 'AAECAwQFBgcICQoLDA0ODw==' });

    expect(await readNonce()).toBe('AAECAwQFBgcICQoLDA0ODw==');
  });

  it('returns undefined when the request carries no nonce', async () => {
    expect(await readNonce()).toBeUndefined();
  });
});
