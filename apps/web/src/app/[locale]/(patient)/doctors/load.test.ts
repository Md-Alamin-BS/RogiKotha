// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ID = 'abcdefgh23';
const CONDITION = 'k2m3n4p5q6';

// Next's notFound() and redirect() never return; the stand-ins throw the same way.
class HttpFallback extends Error {
  constructor(
    readonly status: number,
    readonly target?: string,
  ) {
    super(`NEXT ${status}`);
  }
}

const directory = vi.hoisted(() => ({
  listDoctors: { name: 'directory.listDoctors', execute: vi.fn() },
  getDoctor: { name: 'directory.getDoctor', execute: vi.fn() },
}));
const getContainer = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

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
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('bn') }));
vi.mock('@/i18n/routing', () => ({ redirect }));

import { loadDoctorIndex, loadDoctorProfile } from './load';

const profile = { publicId: ID, name: 'ডা. কাল্পনিক ডাক্তার' };

beforeEach(() => {
  vi.clearAllMocks();
  getContainer.mockReturnValue({
    directory,
    ports: { config: { current: () => Promise.resolve({ limitedDataThreshold: 5 }) } },
  });
  redirect.mockImplementation(({ href }: { href: string }) => {
    throw new HttpFallback(307, href);
  });
});

describe('the doctor index loader', () => {
  it('asks for one page of 100 and passes the threshold on', async () => {
    directory.listDoctors.execute.mockResolvedValue({
      ok: true,
      data: { items: [{ publicId: ID }], page: 1, pageSize: 100, total: 1 },
    });

    expect(await loadDoctorIndex()).toEqual({ cards: [{ publicId: ID }], total: 1, threshold: 5 });
    expect(directory.listDoctors.execute.mock.calls[0]![0]).toEqual({ page: 1, pageSize: 100 });
  });

  it('throws to the error boundary when the query fails', async () => {
    directory.listDoctors.execute.mockResolvedValue({ ok: false, error: { code: 'internal' } });

    await expect(loadDoctorIndex()).rejects.toThrow('directory.listDoctors: internal');
  });
});

describe('the doctor profile loader', () => {
  it('is a 404 for a segment that is not a public id, without asking the container', async () => {
    await expect(loadDoctorProfile('not-an-id', {})).rejects.toMatchObject({ status: 404 });
    expect(getContainer).not.toHaveBeenCalled();
  });

  it('is a 404 when the doctor is not found', async () => {
    directory.getDoctor.execute.mockResolvedValue({ ok: false, error: { code: 'not_found' } });

    await expect(loadDoctorProfile(ID, {})).rejects.toMatchObject({ status: 404 });
  });

  it('passes the valid filters and drops the invalid ones (BR9.3)', async () => {
    directory.getDoctor.execute.mockResolvedValue({ ok: true, data: profile });

    const loaded = await loadDoctorProfile(ID, { outcome: 'helped', relationship: 'friend' });

    expect(directory.getDoctor.execute.mock.calls[0]![0]).toEqual({
      publicId: ID,
      outcome: 'helped',
    });
    expect(loaded).toEqual({ vm: profile, filters: { outcome: 'helped' }, threshold: 5 });
  });

  it('redirects with 307 to the URL without a condition the doctor has no account for', async () => {
    directory.getDoctor.execute.mockResolvedValue({ ok: true, data: profile });

    await expect(loadDoctorProfile(ID, { condition: CONDITION, docs: '1' })).rejects.toMatchObject({
      status: 307,
      target: `/doctors/${ID}?docs=1`,
    });
    expect(redirect).toHaveBeenCalledWith({ href: `/doctors/${ID}?docs=1`, locale: 'bn' });
  });

  it('keeps a condition the doctor has accounts for', async () => {
    const selected = { ...profile, selectedCondition: { publicId: CONDITION, name: 'হাঁপানি' } };
    directory.getDoctor.execute.mockResolvedValue({ ok: true, data: selected });

    const loaded = await loadDoctorProfile(ID, { condition: CONDITION });

    expect(loaded.filters).toEqual({ condition: CONDITION });
    expect(redirect).not.toHaveBeenCalled();
  });
});
