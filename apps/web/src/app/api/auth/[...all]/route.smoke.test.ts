// @vitest-environment node
// Smoke (T-101): the library's sign-up endpoint is closed over HTTP, so registration only runs
// through `account.register` with its limits, timing floor and domain rows.
import { expect, it, vi } from 'vitest';

import { getContainer } from '@/server/container';

import { POST } from './route';

vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

it('answers 404 for /api/auth/sign-up/email with the library handler stubbed', async () => {
  const handler = vi.fn(() => Promise.resolve(new Response('created', { status: 200 })));
  vi.mocked(getContainer).mockReturnValue({ auth: { handler } } as unknown as ReturnType<
    typeof getContainer
  >);

  const response = await POST(
    new Request('http://localhost:3000/api/auth/sign-up/email', { method: 'POST' }),
  );

  expect(response.status).toBe(404);
  expect(handler).not.toHaveBeenCalled();
});
