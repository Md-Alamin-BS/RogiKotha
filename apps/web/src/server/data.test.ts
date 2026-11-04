// @vitest-environment node
import type { Db } from '@rogikotha/database';
import { describe, expect, it, vi } from 'vitest';

import { bindDb } from './data';

const fakeDb = { fake: true } as unknown as Db;

describe('binding the demo data functions to the app client', () => {
  it('passes the client first and the caller arguments after it', async () => {
    const listDoctors = vi.fn((db: Db, locale: string) => Promise.resolve({ db, locale }));
    const bound = bindDb({ listDoctors }, () => fakeDb);

    await expect(bound.listDoctors('bn')).resolves.toEqual({ db: fakeDb, locale: 'bn' });
    expect(listDoctors).toHaveBeenCalledWith(fakeDb, 'bn');
  });

  it('asks for the client on every call, not when binding', () => {
    const getClient = vi.fn(() => fakeDb);
    const bound = bindDb(
      { countReadyEvidence: (_db: Db, reviewId: string) => reviewId },
      getClient,
    );

    expect(getClient).not.toHaveBeenCalled();
    bound.countReadyEvidence('r1');
    bound.countReadyEvidence('r2');
    expect(getClient).toHaveBeenCalledTimes(2);
  });

  it('leaves out exports that are not functions', () => {
    const bound = bindDb({ READY: 'preview_ready', run: (db: Db) => db }, () => fakeDb);
    expect(Object.keys(bound)).toEqual(['run']);
  });
});
