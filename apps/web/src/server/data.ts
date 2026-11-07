// The demo data functions bound to the app's database client. Pages and server actions import
// these, because only `server/**` may import @rogikotha/database (T-010 boundaries).
import { demo, type Db } from '@rogikotha/database';

import { getDb } from './db';

type DataFunction = (db: Db, ...args: never[]) => unknown;

/** A module's data functions without their leading `db` parameter; other exports are dropped. */
export type Bound<M> = {
  [K in keyof M as M[K] extends DataFunction ? K : never]: M[K] extends (
    db: Db,
    ...args: infer A
  ) => infer R
    ? (...args: A) => R
    : never;
};

export function bindDb<M extends object>(mod: M, db: () => Db = getDb): Bound<M> {
  const bound: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value !== 'function') continue;
    const fn = value as (db: Db, ...args: unknown[]) => unknown;
    bound[name] = (...args: unknown[]) => fn(db(), ...args);
  }
  return bound as Bound<M>;
}

export const accounts = bindDb(demo.accounts);
export const comments = bindDb(demo.comments);
export const doctors = bindDb(demo.doctors);
export const reviews = bindDb(demo.reviews);
export const session = bindDb(demo.session);
