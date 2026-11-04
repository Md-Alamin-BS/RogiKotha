// @vitest-environment node
// Adversarial (T-101 plan Step 15, BR8.1, NFR3): the library has its own console logger. When two
// registrations race for one address, the losing insert fails inside the library, which logs the
// raw database error at `error` level. Drizzle 0.45's `DrizzleQueryError` message carries the
// query parameters, so that line would print the address.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthGateway } from './gateway';
import { buildTestLibrary, emptyStore, type TestLibrary } from './library-test-support';

const memory = vi.hoisted(() => {
  const state: { store: Record<string, Record<string, unknown>[]> } = { store: {} };
  return state;
});

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(memory.store) };
});

const EMAIL = 'shirin.demo@example.test';
const PASSWORD = 'a synthetic secret 2026';
const SLOW = 20_000;

/** The shape Drizzle 0.45 throws for a failed insert: its message lists the parameters. */
function aDrizzleUniqueViolation(email: string): Error {
  const cause = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    detail: `Key (email)=(${email}) already exists.`,
  });
  return Object.assign(
    new Error(
      `Failed query: insert into "auth_users" ("id", "email") values ($1, $2) returning *\nparams: 0192,${email}`,
    ),
    { name: 'DrizzleQueryError', cause },
  );
}

let library: TestLibrary;
let printed: string[];

function capture(...args: unknown[]): void {
  printed.push(
    args
      .map((arg) =>
        arg instanceof Error
          ? `${arg.message} ${String((arg.cause as { detail?: unknown } | undefined)?.detail)}`
          : String(arg),
      )
      .join(' '),
  );
}

beforeEach(() => {
  memory.store = emptyStore();
  library = buildTestLibrary();
  printed = [];
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation(capture);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a racing registration whose insert fails inside the library', () => {
  it(
    'answers email_exists and prints the address on no console line',
    async () => {
      const gateway = createAuthGateway(library.auth, library.logger);
      const first = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
      expect(first.ok).toBe(true);
      const { internalAdapter } = await library.auth.$context;
      // Both the gateway's look and the library's own look miss the row the other request is
      // committing; the insert then hits the unique index.
      vi.spyOn(internalAdapter, 'findUserByEmail')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      vi.spyOn(internalAdapter, 'createUser').mockRejectedValueOnce(aDrizzleUniqueViolation(EMAIL));

      const again = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });

      expect(again).toEqual({ ok: false, error: { code: 'email_exists' } });
      expect(JSON.stringify(library.logger.lines)).not.toContain(EMAIL);
      expect(printed.filter((line) => line.includes(EMAIL))).toEqual([]);
    },
    SLOW,
  );
});
