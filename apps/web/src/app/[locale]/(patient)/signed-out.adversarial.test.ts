// Adversarial tests (plan Step 13): reach the signed-in pages without a usable session, and open
// another author's edit page. The real `server/auth/session.ts` and `getActor()` run; only the
// container's session lookup and the data layer are stubbed, so a page that skipped the check would read data here.
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect as redirectToSignIn } from '@rogikotha/i18n';
import { headers } from 'next/headers';
import { createElement, isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContributionGatePanel } from '@/components/patient/auth/ContributionGate';
import { safeAuthNext, safeNextPath } from '@/server/actions/auth-form';
import { getContainer } from '@/server/container';
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
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));
vi.mock('@/server/actions/profile', () => ({
  updateDisplayNameAction: vi.fn(),
  updateLanguageAction: vi.fn(),
}));
vi.mock('@/server/actions/review', () => ({ saveReviewEdit: vi.fn() }));
vi.mock('@/server/data', () => ({
  accounts: { getProfile: vi.fn(), listOwnReviews: vi.fn() },
  doctors: { getDoctor: vi.fn() },
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
const listDoctorsCommand = { name: 'directory.listDoctors', execute: vi.fn() };
const NOW = new Date('2026-11-04T09:00:00Z');

/** The Better Auth user behind the request's session cookie; null means no cookie at all. */
function sessionCookieOf(authUserId: string | null): void {
  getSession.mockResolvedValue(
    authUserId
      ? {
          sessionId: `session-${authUserId}`,
          authUserId,
          createdAt: NOW,
          updatedAt: NOW,
          expiresAt: new Date(NOW.getTime() + 86_400_000),
        }
      : null,
  );
}

/** The container `getActor()` reads: the stubbed session and the synthetic profiles above. */
function installContainer(): void {
  const findProfileByAuthUserId = (_tx: unknown, authUserId: string) => {
    const account = ACCOUNTS_BY_AUTH_USER.get(authUserId);
    return Promise.resolve(
      account
        ? {
            accountId: account.accountId,
            authUserId: account.authUserId,
            username: account.username,
            displayName: account.displayName,
            locale: account.locale,
            status: account.status,
          }
        : null,
    );
  };
  vi.mocked(getContainer).mockReturnValue({
    env: { appMode: 'demo' },
    directory: { listDoctors: listDoctorsCommand },
    ports: {
      authGateway: { getSession, revokeSession: vi.fn(() => Promise.resolve()) },
      unitOfWork: { read: (work: (tx: unknown) => unknown) => work({}) },
      accounts: { findProfileByAuthUserId },
      clock: { now: () => NOW },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    },
  } as unknown as ReturnType<typeof getContainer>);
}

function editPage(id: string) {
  return EditExperiencePage({ params: Promise.resolve({ id }) });
}

function composerPage(doctor?: string) {
  return ComposerPage({ searchParams: Promise.resolve(doctor ? { doctor } : {}) });
}

/** The gate the write page rendered, found in its element tree (U47 BR8.1). */
function gateOf(node: unknown): { access: string; next: string | null } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = gateOf(child);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const props = node.props as { access: string; next: string | null; children?: unknown };
  if (node.type === ContributionGatePanel) return { access: props.access, next: props.next };
  return gateOf(props.children);
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
  expect(doctors.getDoctor).not.toHaveBeenCalled();
  expect(reviews.getOwnReviewForEdit).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue(new Headers({ cookie: 'rk.session_token=forged' }));
  installContainer();
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

  // U47 BR8.1: /write now shows U9's gate instead of redirecting, so the gate's sign-in link
  // carries the return path; the page still reads nothing before access is `allowed`.
  it('is shown the gate on /write with a way back, and no doctor list is read', async () => {
    const page = await composerPage();

    expect(gateOf(page)).toEqual({ access: 'signed-out', next: '/en/write' });
    expect(listDoctorsCommand.execute).not.toHaveBeenCalled();
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
      const next = gateOf(await composerPage(doctor))?.next ?? null;

      expect(next).toMatch(/^\/en\/write\?doctor=/);
      expect(safeAuthNext(next)).toBe(next);
      expect(safeNextPath(next)).toBe(next);
      expect(listDoctorsCommand.execute).not.toHaveBeenCalled();
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
