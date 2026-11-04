// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { getAuth } from '@/server/auth/instance';

import { GET, POST } from './route';

vi.mock('@/server/auth/instance', () => ({ getAuth: vi.fn() }));

describe('the /api/auth route', () => {
  it.each([
    ['GET', GET, 'http://localhost:3000/api/auth/get-session'],
    ['POST', POST, 'http://localhost:3000/api/auth/sign-in/email'],
  ] as const)('hands a %s request to Better Auth', async (_method, handle, url) => {
    const handler = vi.fn(() => Promise.resolve(new Response('handled', { status: 200 })));
    vi.mocked(getAuth).mockReturnValue({ handler } as unknown as ReturnType<typeof getAuth>);

    const response = await handle(new Request(url, { method: _method }));

    expect(await response.text()).toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
