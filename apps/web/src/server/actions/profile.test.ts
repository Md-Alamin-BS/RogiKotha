import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from '@/i18n/routing';
import { requireAccount } from '@/server/auth/session';
import { accounts } from '@/server/data';
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { updateDisplayNameAction, updateLanguageAction } from './profile';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn() }));
vi.mock('@/server/data', () => ({
  accounts: { updateDisplayName: vi.fn(), updateLocale: vi.fn() },
}));

const store = { set: vi.fn(), delete: vi.fn() };
const IDLE = { status: 'idle' } as const;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function buildCurrentAccount(overrides: Partial<DemoCurrentAccount>): DemoCurrentAccount {
  return {
    accountId: 'account-signed-in',
    authUserId: 'auth-signed-in',
    username: 'rina_demo',
    displayName: 'Rina Akter',
    locale: 'en',
    status: 'active',
    currentPersonaId: 'persona-current',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

function signedInAs(overrides: Partial<DemoCurrentAccount> = {}) {
  const account = buildCurrentAccount(overrides);
  vi.mocked(requireAccount).mockResolvedValue(account);
  return account;
}

function signedOut() {
  vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT /en/sign-in?next=/me'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(accounts.updateDisplayName).mockResolvedValue({ personaId: 'persona-new' });
  vi.mocked(accounts.updateLocale).mockResolvedValue(undefined);
});

describe('the display-name action', () => {
  it('sends a signed-out user to sign in, back to /me, and saves nothing', async () => {
    signedOut();
    await expect(updateDisplayNameAction(IDLE, form({ displayName: 'Rina A.' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(requireAccount).toHaveBeenCalledWith({ returnTo: '/me' });
    expect(accounts.updateDisplayName).not.toHaveBeenCalled();
  });

  it('saves a new name for the signed-in account and refreshes the pages', async () => {
    const account = signedInAs();
    const state = await updateDisplayNameAction(IDLE, form({ displayName: '  Rina A.  ' }));
    expect(accounts.updateDisplayName).toHaveBeenCalledWith(account.accountId, 'Rina A.');
    expect(state).toEqual({ status: 'saved', value: 'Rina A.' });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('renames only the signed-in account, whatever account id the form carries', async () => {
    const account = signedInAs();
    await updateDisplayNameAction(
      IDLE,
      form({ displayName: 'Taken Over', accountId: 'someone-else' }),
    );
    expect(accounts.updateDisplayName).toHaveBeenCalledTimes(1);
    expect(accounts.updateDisplayName).toHaveBeenCalledWith(account.accountId, 'Taken Over');
  });

  it('refuses a blank name with the required message and saves nothing', async () => {
    signedInAs();
    const state = await updateDisplayNameAction(IDLE, form({ displayName: '   ' }));
    expect(state).toEqual({
      status: 'error',
      errorKey: 'formErrors.profile.displayNameRequired',
      value: '   ',
    });
    expect(accounts.updateDisplayName).not.toHaveBeenCalled();
  });

  it('refuses a form without the field', async () => {
    signedInAs();
    const state = await updateDisplayNameAction(IDLE, form({}));
    expect(state).toEqual({ status: 'error', errorKey: 'formErrors.profile.displayNameRequired' });
    expect(accounts.updateDisplayName).not.toHaveBeenCalled();
  });

  it('refuses a name longer than 60 characters with the length message', async () => {
    signedInAs();
    const state = await updateDisplayNameAction(IDLE, form({ displayName: 'n'.repeat(61) }));
    expect(state).toMatchObject({
      status: 'error',
      errorKey: 'formErrors.profile.displayNameTooLong',
    });
    expect(accounts.updateDisplayName).not.toHaveBeenCalled();
  });

  it('accepts a name of exactly 60 characters', async () => {
    signedInAs();
    const state = await updateDisplayNameAction(IDLE, form({ displayName: 'n'.repeat(60) }));
    expect(state).toEqual({ status: 'saved', value: 'n'.repeat(60) });
  });

  it('creates no new persona when the name has not changed', async () => {
    signedInAs({ displayName: 'Rina Akter' });
    const state = await updateDisplayNameAction(IDLE, form({ displayName: 'Rina Akter' }));
    expect(state).toEqual({ status: 'saved', value: 'Rina Akter' });
    expect(accounts.updateDisplayName).not.toHaveBeenCalled();
  });
});

describe('the language action', () => {
  it('sends a signed-out user to sign in and changes nothing', async () => {
    signedOut();
    await expect(updateLanguageAction(IDLE, form({ locale: 'bn' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(accounts.updateLocale).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it('saves the language on the account, stores it in the language cookie and reopens /me in it', async () => {
    const account = signedInAs({ locale: 'en' });
    await expect(updateLanguageAction(IDLE, form({ locale: 'bn' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(accounts.updateLocale).toHaveBeenCalledWith(account.accountId, 'bn');
    expect(store.set).toHaveBeenCalledWith('rk.lang', 'bn', expect.objectContaining({ path: '/' }));
    expect(redirect).toHaveBeenCalledWith({ href: '/me', locale: 'bn' });
  });

  it('refuses an unknown language and changes nothing', async () => {
    signedInAs();
    const state = await updateLanguageAction(IDLE, form({ locale: 'fr' }));
    expect(state).toEqual({ status: 'error', errorKey: 'errors.common.validation' });
    expect(accounts.updateLocale).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('keeps the account untouched when the chosen language is already saved', async () => {
    signedInAs({ locale: 'bn' });
    await expect(updateLanguageAction(IDLE, form({ locale: 'bn' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(accounts.updateLocale).not.toHaveBeenCalled();
    expect(store.set).toHaveBeenCalledWith('rk.lang', 'bn', expect.anything());
  });
});
