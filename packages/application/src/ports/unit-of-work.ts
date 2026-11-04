// T-101 BR7.11, functional-spec § 10.1.
import type { AppError, Result } from '@rogikotha/contracts';

declare const TX_BRAND: unique symbol;

/**
 * An open database transaction (or, inside `UnitOfWork.read`, a plain connection). Opaque here;
 * `packages/database` casts it to its Drizzle executor. Repositories take it as their first argument.
 */
export interface Tx {
  readonly [TX_BRAND]: 'Tx';
}

/** A handler error that must still commit, such as a refused attempt that is audited. */
export interface RecordedError {
  ok: false;
  error: AppError;
  recorded: true;
}

export type HandlerResult<T> = Result<T> | RecordedError;

/** Commit on `ok` or on a `recorded` error; roll back on any other error. */
export function shouldCommit(result: HandlerResult<unknown>): boolean {
  return result.ok || ('recorded' in result && result.recorded);
}

export interface UnitOfWork {
  /**
   * Runs `work` in one transaction, commits or rolls back by `shouldCommit`, and returns its
   * result unchanged. A throw rolls back and is rethrown.
   */
  run<T>(work: (tx: Tx) => Promise<HandlerResult<T>>): Promise<HandlerResult<T>>;
  /** Runs read-only `work` on a connection without opening a transaction (queries, `getActor`). */
  read<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
