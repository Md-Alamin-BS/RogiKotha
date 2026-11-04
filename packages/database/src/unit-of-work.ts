// The `UnitOfWork` port (T-101 BR7.11, functional-spec § 10.1): one Drizzle transaction per command.
// The opaque application `Tx` is the Drizzle transaction (or, in `read`, the client) underneath.
// Type imports only: a value import of the `@rogikotha/application` root would load the account
// module into the worker, which imports this package (FD-093 (2), BR8.6).
import type { HandlerResult, Tx as AppTx, UnitOfWork } from '@rogikotha/application';
import { TransactionRollbackError } from 'drizzle-orm';

import type { Db, Tx } from './client';

/** The port's `shouldCommit` rule: commit on `ok` or on an error marked `recorded`. */
function commits(result: HandlerResult<unknown>): boolean {
  return result.ok || ('recorded' in result && result.recorded);
}

/** What a repository runs its statements on: a transaction, or the client for `read`. */
export type Executor = Db | Tx;

/** The one cast from the application's opaque `Tx` back to Drizzle. */
export function executorOf(tx: AppTx): Executor {
  return tx as unknown as Executor;
}

/** The reverse cast, for code that already holds a Drizzle transaction (tests, the seed). */
export function appTxOf(executor: Executor): AppTx {
  return executor as unknown as AppTx;
}

export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Db) {}

  async run<T>(work: (tx: AppTx) => Promise<HandlerResult<T>>): Promise<HandlerResult<T>> {
    let outcome: HandlerResult<T> | undefined;
    try {
      await this.db.transaction(async (tx) => {
        outcome = await work(appTxOf(tx));
        // Drizzle rolls back by throwing `TransactionRollbackError` out of `transaction`.
        if (!commits(outcome)) tx.rollback();
      });
    } catch (error) {
      if (error instanceof TransactionRollbackError && outcome !== undefined) return outcome;
      throw error;
    }
    // Set by the callback above whenever `transaction` resolved.
    return outcome!;
  }

  read<T>(work: (tx: AppTx) => Promise<T>): Promise<T> {
    return work(appTxOf(this.db));
  }
}
