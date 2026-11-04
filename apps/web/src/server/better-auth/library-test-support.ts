// A real Better Auth instance on the library's memory adapter, for the gateway and hook tests.
// The Drizzle adapter is swapped by the test file's `vi.mock`; everything else is the pinned
// library with this Unit's options.
import type { LogFields, Logger, PasswordHasher } from '@rogikotha/application';
import type { AccountStatus } from '@rogikotha/contracts';
import type { Db } from '@rogikotha/database';

import { createAuthInstance, type AuthInstance } from './instance';

export const TEST_APP_URL = 'http://localhost:3000';
export const TEST_SECRET = 'a-synthetic-test-secret-of-at-least-32-chars';

/** The memory adapter's tables, keyed by this Unit's model names. */
export type MemoryStore = Record<string, Record<string, unknown>[]>;

export function emptyStore(): MemoryStore {
  return { auth_users: [], auth_sessions: [], auth_accounts: [], auth_verifications: [] };
}

/** Fast and reversible enough for tests; never used outside them. */
export const fastHasher: PasswordHasher = {
  hash: (password) => Promise.resolve(`fast$${password}`),
  verify: (password, phc) => Promise.resolve(phc === `fast$${password}`),
};

export interface RecordedLog {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: LogFields | undefined;
}

export function recordingLogger(): Logger & { lines: RecordedLog[] } {
  const lines: RecordedLog[] = [];
  return {
    lines,
    info: (event, fields) => lines.push({ level: 'info', event, fields }),
    warn: (event, fields) => lines.push({ level: 'warn', event, fields }),
    error: (event, fields) => lines.push({ level: 'error', event, fields }),
  };
}

export interface TestLibrary {
  auth: AuthInstance;
  logger: ReturnType<typeof recordingLogger>;
  /** Profile statuses by library user id; a user missing here has no profile. */
  statuses: Map<string, AccountStatus>;
}

export function buildTestLibrary(): TestLibrary {
  const logger = recordingLogger();
  const statuses = new Map<string, AccountStatus>();
  const auth = createAuthInstance({
    db: {} as Db,
    secret: TEST_SECRET,
    appUrl: TEST_APP_URL,
    hasher: fastHasher,
    logger,
    accountStatusOf: (authUserId) => Promise.resolve(statuses.get(authUserId) ?? null),
  });
  return { auth, logger, statuses };
}
