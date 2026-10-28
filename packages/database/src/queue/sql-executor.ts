// The executor shape pg-boss's `send(..., { db })` takes, kept local so no
// pg-boss type leaves this package (BR3.9).
import type { PoolClient } from 'pg';

export interface SqlExecutor {
  executeSql(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

/** Runs every statement on `client`, so they join whatever transaction it has open. */
export function clientExecutor(client: PoolClient): SqlExecutor {
  return {
    async executeSql(text, values) {
      const result = await client.query(text, values);
      return { rows: result.rows as unknown[] };
    },
  };
}
