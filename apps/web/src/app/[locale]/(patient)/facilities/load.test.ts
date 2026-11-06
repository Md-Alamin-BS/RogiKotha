// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ID = 'abcdefgh23';

class HttpFallback extends Error {
  constructor(readonly status: number) {
    super(`NEXT ${status}`);
  }
}

const directory = vi.hoisted(() => ({
  listFacilities: { name: 'directory.listFacilities', execute: vi.fn() },
  getFacility: { name: 'directory.getFacility', execute: vi.fn() },
}));
const getContainer = vi.hoisted(() => vi.fn());

vi.mock('@/server/container', () => ({ getContainer }));
vi.mock('@/server/auth', () => ({
  getRequestContext: () =>
    Promise.resolve({ actor: { locale: 'en', correlationId: 'c-1' }, request: {} }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new HttpFallback(404);
  },
}));

import { loadFacilityIndex, loadFacilityProfile } from './load';

beforeEach(() => {
  vi.clearAllMocks();
  getContainer.mockReturnValue({
    directory,
    ports: { config: { current: () => Promise.resolve({ limitedDataThreshold: 5 }) } },
  });
});

describe('the facility loaders', () => {
  it('list one page of 100 with the threshold', async () => {
    directory.listFacilities.execute.mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 100, total: 0 },
    });

    expect(await loadFacilityIndex()).toEqual({ cards: [], total: 0, threshold: 5 });
    expect(directory.listFacilities.execute.mock.calls[0]![0]).toEqual({ page: 1, pageSize: 100 });
  });

  it('give a 404 for a malformed id without asking the container, and for an unknown one', async () => {
    await expect(loadFacilityProfile('nope')).rejects.toMatchObject({ status: 404 });
    expect(getContainer).not.toHaveBeenCalled();

    directory.getFacility.execute.mockResolvedValue({ ok: false, error: { code: 'not_found' } });
    await expect(loadFacilityProfile(ID)).rejects.toMatchObject({ status: 404 });
  });

  it('return a visible facility with the threshold', async () => {
    const vm = { publicId: ID, name: 'Synthetic General Hospital' };
    directory.getFacility.execute.mockResolvedValue({ ok: true, data: vm });

    expect(await loadFacilityProfile(ID)).toEqual({ vm, threshold: 5 });
    expect(directory.getFacility.execute.mock.calls[0]![0]).toEqual({ publicId: ID });
  });

  it('throw to the error boundary on any other failure', async () => {
    directory.getFacility.execute.mockResolvedValue({ ok: false, error: { code: 'internal' } });

    await expect(loadFacilityProfile(ID)).rejects.toThrow('directory.getFacility: internal');
  });
});
