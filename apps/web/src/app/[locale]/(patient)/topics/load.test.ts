// @vitest-environment node
import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ID = 'abcdefgh23';

class HttpFallback extends Error {
  constructor(readonly status: number) {
    super(`NEXT ${status}`);
  }
}

const taxonomy = vi.hoisted(() => ({
  listConditions: { name: 'taxonomy.listConditions', execute: vi.fn() },
  getCondition: { name: 'taxonomy.getCondition', execute: vi.fn() },
}));
const getContainer = vi.hoisted(() => vi.fn());

vi.mock('@/server/container', () => ({ getContainer }));
vi.mock('@/server/auth', () => ({
  getRequestContext: () =>
    Promise.resolve({ actor: { locale: 'bn', correlationId: 'c-1' }, request: {} }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new HttpFallback(404);
  },
}));

import { loadConditionPage, loadTopicIndex } from './load';

beforeEach(() => {
  vi.clearAllMocks();
  getContainer.mockReturnValue({
    taxonomy,
    ports: { config: { current: () => Promise.resolve(DEFAULT_CONFIG_VALUES) } },
  });
});

describe('the topic loaders', () => {
  it('list every topic, an empty one included', async () => {
    const cards = [{ publicId: ID, name: 'হাঁপানি', accountsTotal: 0 }];
    taxonomy.listConditions.execute.mockResolvedValue({ ok: true, data: cards });

    expect(await loadTopicIndex()).toEqual({ cards, total: 1 });
  });

  it('give a 404 for a malformed id without asking the container, and for a hidden one', async () => {
    await expect(loadConditionPage('x')).rejects.toMatchObject({ status: 404 });
    expect(getContainer).not.toHaveBeenCalled();

    taxonomy.getCondition.execute.mockResolvedValue({ ok: false, error: { code: 'not_found' } });
    await expect(loadConditionPage(ID)).rejects.toMatchObject({ status: 404 });
  });

  it('give the condition page its threshold and the emergency settings', async () => {
    const vm = { publicId: ID, name: 'হাঁপানি' };
    taxonomy.getCondition.execute.mockResolvedValue({ ok: true, data: vm });

    expect(await loadConditionPage(ID)).toEqual({
      vm,
      threshold: DEFAULT_CONFIG_VALUES.limitedDataThreshold,
      emergency: DEFAULT_CONFIG_VALUES.emergency,
    });
  });

  it('throw to the error boundary on any other failure', async () => {
    taxonomy.listConditions.execute.mockResolvedValue({ ok: false, error: { code: 'internal' } });

    await expect(loadTopicIndex()).rejects.toThrow('taxonomy.listConditions: internal');
  });
});
