// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { getContainer } from '@/server/container';

import { GET, POST } from './route';

vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

function stubHandler() {
  const handler = vi.fn(() => Promise.resolve(new Response('handled', { status: 200 })));
  vi.mocked(getContainer).mockReturnValue({ auth: { handler } } as unknown as ReturnType<
    typeof getContainer
  >);
  return handler;
}

describe('the /api/auth route (BR7.1)', () => {
  // First, before any request below reaches the container.
  it('builds nothing until a request arrives (BR7.2)', () => {
    expect(getContainer).not.toHaveBeenCalled();
  });

  it('hands the allowlisted /api/auth/ok to Better Auth', async () => {
    const handler = stubHandler();

    const response = await GET(new Request('http://localhost:3000/api/auth/ok'));

    expect(await response.text()).toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('answers the closed get-session read with a 404 and a JSON null', async () => {
    const handler = stubHandler();

    const response = await GET(new Request('http://localhost:3000/api/auth/get-session'));

    expect(response.status).toBe(404);
    expect(await response.json()).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    '/api/auth/sign-in/email',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/sign-out',
    '/api/auth/list-sessions',
    '/api/auth/get-session/../sign-in/email',
  ])('answers 404 for %s without reaching the library', async (path) => {
    const handler = stubHandler();

    const response = await POST(new Request(`http://localhost:3000${path}`, { method: 'POST' }));

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });
});
