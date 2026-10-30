// Adversarial tests (plan Step 13): reach the signed-in pages without a usable session, and open
// another author's edit page. The real `server/auth/session.ts` runs; only Better Auth's session
// lookup and the data layer are stubbed, so a page that skipped the check would read data here.
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect as redirectToSignIn } from '@rogikotha/i18n';
import { headers } from 'next/headers';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { safeNextPath } from '@/server/actions/auth-form';
import { getAuth } from '@/server/auth/instance';
import { accounts, doctors, reviews, session } from '@/server/data';
import EditExperiencePage from './experiences/[id]/edit/page';
import WorkspacePage from './me/page';
import ComposerPage from './write/page';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(() => Promise.resolve('en')),
  getTranslations: vi.fn(() => Promise.resolve((key: string) => key)),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement('a', { href }, children),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/server/auth/instance', () => ({ getAuth: vi.fn() }));
vi.mock('@/server/actions/profile', () => ({
  updateDisplayNameAction: vi.fn(),
  updateLanguageAction: vi.fn(),
}));
vi.mock('@/server/actions/review', () => ({ publishReview: vi.fn(), saveReviewEdit: vi.fn() }));
vi.mock('@/server/data', () => ({
  accounts: { getProfile: vi.fn(), listOwnReviews: vi.fn() },
  doctors: { getDoctor: vi.fn(), listDoctorOptions: vi.fn() },
  reviews: { getOwnReviewForEdit: vi.fn() },
  session: { getCurrentAccountByAuthUserId: vi.fn() },
}));

const VICTIM_REVIEW = 'v1ct1mrev1';

function buildAccount(name: string, overrides: Partial<DemoCurrentAccount> = {}) {
  return {
    accountId: `account-${name}`,
    authUserId: `auth-${name}`,
    username: `${name}_synthetic`,
    displayName: `${name} synthetic`,
    locale: 'en',
    status: 'active',
    currentPersonaId: `persona-${name}`,
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  } satisfies DemoCurrentAccount;
}

const ATTACKER = buildAccount('attacker');
const SUSPENDED = buildAccount('suspended', { status: 'suspended' });
const ACCOUNTS_BY_AUTH_USER = new Map<string, DemoCurrentAccount>(
  [ATTACKER, SUSPENDED].map((account) => [account.authUserId, account]),
);

const getSession = vi.fn();

function sessionCookieOf(authUserId: string | null): void {
  getSession.mockResolvedValue(authUserId ? { user: { id: authUserId }, session: {} } : null);
}

function editPage(id: string) {
  return EditExperiencePage({ params: Promise.resolve({ id }) });
}

function composerPage(doctor?: string) {
  return ComposerPage({ searchParams: Promise.resolve(doctor ? { doctor } : {}) });
}

/** The `?next=` the sign-in redirect carried. */
function nextOfSignInRedirect(): string | undefined {
  const href = vi.mocked(redirectToSignIn).mock.calls[0]?.[0].href;
  if (!href || typeof href === 'string') return undefined;
  return (href.query as { next?: string } | undefined)?.next;
}

function nothingWasRead(): void {
  expect(accounts.getProfile).not.toHaveBeenCalled();
  expect(accounts.listOwnReviews).not.toHaveBeenCalled();
  expect(doctors.listDoctorOptions).not.toHaveBeenCalled();
  expect(doctors.getDoctor).not.toHaveBeenCalled();
  expect(reviews.getOwnReviewForEdit).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue(new Headers({ cookie: 'rk.session_token=forged' }));
  vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as unknown as ReturnType<
    typeof getAuth
  >);
  vi.mocked(session.getCurrentAccountByAuthUserId).mockImplementation((authUserId) =>
    Promise.resolve(ACCOUNTS_BY_AUTH_USER.get(authUserId) ?? null),
  );
  vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue(null);
});

describe.each([
  ['with no session cookie', null],
  ['with the live session of a suspended account', SUSPENDED.authUserId],
  ['with a session whose Better Auth user has no profile', 'auth-orphan'],
])('a visitor %s (FR2, FR4.1)', (_kind, authUserId) => {
  beforeEach(() => sessionCookieOf(authUserId));

  it('is sent from /me to sign in and back, and no profile is read', async () => {
    await expect(WorkspacePage()).rejects.toThrow('NEXT_REDIRECT');

    expect(nextOfSignInRedirect()).toBe('/me');
    nothingWasRead();
  });

  it('is sent from /write to sign in and back, and no doctor list is read', async () => {
    await expect(composerPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(nextOfSignInRedirect()).toBe('/write');
    nothingWasRead();
  });

  it('is sent from an edit page to sign in and back to it, and no experience is read', async () => {
    await expect(editPage(VICTIM_REVIEW)).rejects.toThrow('NEXT_REDIRECT');

    expect(nextOfSignInRedirect()).toBe(`/experiences/${VICTIM_REVIEW}/edit`);
    nothingWasRead();
  });
});

describe('the return path a signed-out visitor carries to sign in (FR1.2)', () => {
  beforeEach(() => sessionCookieOf(null));

  it.each(['//evil.example', '/.//evil.example', 'https://evil.example/'])(
    'stays on /write when ?doctor= is %j',
    async (doctor) => {
      await expect(composerPage(doctor)).rejects.toThrow('NEXT_REDIRECT');

      expect(safeNextPath(nextOfSignInRedirect())).toMatch(/^\/write\?doctor=/);
    },
  );

  it('is never built from a malformed experience id: the edit page answers not found first', async () => {
    await expect(editPage('..%2F..%2Fevil')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(redirectToSignIn).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe("an attacker opening the victim's edit page (FR4.2)", () => {
  beforeEach(() => sessionCookieOf(ATTACKER.authUserId));

  it('gets not found, looked up with their own account, and the editor is never built', async () => {
    await expect(editPage(VICTIM_REVIEW)).rejects.toThrow('NEXT_NOT_FOUND');

    expect(reviews.getOwnReviewForEdit).toHaveBeenCalledWith(VICTIM_REVIEW, ATTACKER.accountId);
    expect(doctors.getDoctor).not.toHaveBeenCalled();
  });
});
