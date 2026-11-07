import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@rogikotha/contracts';

import { runCommand } from '@/server/command-call';
import { loadThread } from './comment-thread';

const getThread = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: () => ({ community: { getThread } }) }));

beforeEach(() => {
  vi.mocked(runCommand).mockReset();
});

describe('loadThread', () => {
  it('runs the community getThread query with the public id and returns its view model', async () => {
    const thread = { open: true, items: [], truncated: false };
    vi.mocked(runCommand).mockResolvedValue(ok(thread));

    await expect(loadThread('exp0000001')).resolves.toBe(thread);
    expect(runCommand).toHaveBeenCalledWith(getThread, { reviewPublicId: 'exp0000001' });
  });

  it('throws an error named by the code when the query is refused, so the slot can log it', async () => {
    vi.mocked(runCommand).mockResolvedValue(err('internal'));

    await expect(loadThread('exp0000001')).rejects.toMatchObject({ name: 'internal' });
  });
});
