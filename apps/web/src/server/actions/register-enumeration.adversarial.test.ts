// @vitest-environment node
// Adversarial test (T-101 Step 15, tester 1): learn whether an address is registered by sending the
// register form for it with a password of one's own. `account.register` answers both branches the
// same (BR1.4); the commands here keep that contract, so only what the form action adds is attacked.
import type { Command } from '@rogikotha/application';
import type { Result } from '@rogikotha/contracts';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect as redirectInLocale } from '@/i18n/routing';
import { runCommand } from '../command-call';
import { getContainer } from '../container';
import { register } from './auth';
import { INITIAL_AUTH_STATE } from './auth-form';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(() => Promise.resolve('en')) }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('../command-call', () => ({ runCommand: vi.fn(), applySessionEffect: vi.fn() }));
vi.mock('../container', () => ({ getContainer: vi.fn() }));

const REGISTERED_EMAIL = 'farida.demo@example.test';
const FRESH_EMAIL = 'nobody.demo@example.test';
const OWNER_PASSWORD = 'the owner’s own secret';
const ATTACKER_PASSWORD = 'an attacker chosen secret';

/** The library's credentials, keyed by address, as the commands would see them. */
let credentials: Map<string, string>;
let freshIds: number;

/** `account.register` and `account.signIn` as their contracts answer (BR1.4, BR3.1). */
function commandsBehaveAsSpecified(): void {
  vi.mocked(runCommand).mockImplementation((command: Command<unknown, unknown>, raw: unknown) => {
    const input = raw as { email: string; password: string };
    freshIds += 1;
    if (command.name === 'account.register') {
      // Both branches: the same success and a new random id; only a new address is stored.
      if (!credentials.has(input.email)) credentials.set(input.email, input.password);
      return Promise.resolve({ ok: true, data: { accountId: `fresh-${freshIds}` } });
    }
    if (command.name === 'account.signIn') {
      const matches = credentials.get(input.email) === input.password;
      const result: Result<unknown> = matches
        ? { ok: true, data: { session: { kind: 'set', setCookies: ['rk.session_token=t'] } } }
        : {
            ok: false,
            error: {
              code: 'auth.invalid_credentials',
              messageKey: 'errors.auth.invalidCredentials',
              correlationId: 'corr-1',
            },
          };
      return Promise.resolve(result as Result<never>);
    }
    throw new Error(`unexpected command ${command.name}`);
  });
}

function registerForm(email: string): FormData {
  const form = new FormData();
  const values = {
    email,
    password: ATTACKER_PASSWORD,
    username: `probe_${freshIds}`,
    displayName: 'Probe Demo',
    locale: 'en',
    age: 'on',
    terms: 'on',
  };
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

/** Everything the browser can observe from one submission: the form state or where it was sent. */
async function observe(email: string): Promise<unknown> {
  vi.mocked(redirect).mockClear();
  vi.mocked(redirectInLocale).mockClear();
  try {
    return { state: await register(INITIAL_AUTH_STATE, registerForm(email)) };
  } catch {
    return {
      redirected: [...vi.mocked(redirect).mock.calls, ...vi.mocked(redirectInLocale).mock.calls],
    };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  credentials = new Map([[REGISTERED_EMAIL, OWNER_PASSWORD]]);
  freshIds = 0;
  vi.mocked(getContainer).mockReturnValue({
    ports: {},
  } as unknown as ReturnType<typeof getContainer>);
  commandsBehaveAsSpecified();
});

describe('account enumeration through the register form (BR1.4, NFR3)', () => {
  it('answers a registered address exactly as it answers a fresh one', async () => {
    const forFresh = await observe(FRESH_EMAIL);
    const forRegistered = await observe(REGISTERED_EMAIL);

    expect(forRegistered).toEqual(forFresh);
  });
});
