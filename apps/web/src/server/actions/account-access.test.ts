// @vitest-environment node
// C16 `getContributionAccess` (BR8.1, BR8.3): one access rule for the gate and its consumers.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountStatus } from '@rogikotha/contracts';

import { getActor } from '../auth';
import { getContainer } from '../container';
import { anonymousContext, signedInContext } from '../request-context-test-support';
import { getContributionAccess } from './account';

vi.mock('../auth', () => ({ getActor: vi.fn() }));
vi.mock('../container', () => ({ getContainer: vi.fn() }));

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function actorWith(status: AccountStatus) {
  return signedInContext({ authUserId: 'auth-1', status }).actor;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getContainer).mockReturnValue({ ports: { logger } } as unknown as ReturnType<
    typeof getContainer
  >);
});

describe('who may write or comment', () => {
  it('is signed-out for an anonymous visitor', async () => {
    vi.mocked(getActor).mockResolvedValue(anonymousContext().actor);
    await expect(getContributionAccess()).resolves.toBe('signed-out');
  });

  it('is unconfirmed for an account waiting for its email', async () => {
    vi.mocked(getActor).mockResolvedValue(actorWith('pending_verification'));
    await expect(getContributionAccess()).resolves.toBe('unconfirmed');
  });

  it('is allowed only for an active account with a confirmed email', async () => {
    vi.mocked(getActor).mockResolvedValue(actorWith('active'));
    await expect(getContributionAccess()).resolves.toBe('allowed');

    vi.mocked(getActor).mockResolvedValue({ ...actorWith('active'), emailVerified: false });
    await expect(getContributionAccess()).resolves.toBe('unavailable');
  });

  it.each(['suspended', 'restricted', 'banned'] as const)(
    'is unavailable when %s',
    async (status) => {
      vi.mocked(getActor).mockResolvedValue(actorWith(status));
      await expect(getContributionAccess()).resolves.toBe('unavailable');
    },
  );

  it('fails closed to signed-out and logs no personal field when the Actor cannot be read', async () => {
    vi.mocked(getActor).mockRejectedValue(new TypeError('session store down'));

    await expect(getContributionAccess()).resolves.toBe('signed-out');
    expect(logger.error).toHaveBeenCalledWith('auth.contribution_access_failed', {
      errorCode: 'TypeError',
    });
  });
});
