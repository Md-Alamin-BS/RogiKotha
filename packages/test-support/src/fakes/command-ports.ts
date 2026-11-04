// Every `CommandPorts` member as a fake, wired into one consistent world: the gateway and the
// account repository share one `FakeAuthStore`, and the unit of work rolls back every fake that
// holds application rows. Application tests build one per test (T-101 § 11).
import type { CommandCall, CommandPorts, RequestHeaders } from '@rogikotha/application';
import type { AccountStatus, Actor, Locale } from '@rogikotha/contracts';

import { seq } from '../builders/seq.js';
import { ListAuditWriter } from './audit-writer.js';
import { FakeAccountRepository } from './account-repository.js';
import { FakeAuthGateway, sessionHeaders } from './auth-gateway.js';
import { FakeAuthStore } from './auth-store.js';
import { ClockSleeper, FakeClock, ImmediateAfterResponse } from './clock.js';
import { StaticConfigProvider } from './config-provider.js';
import { FakeCrypto } from './crypto.js';
import { FakeEmailDeliveryRepository } from './email-delivery-repository.js';
import { FastHasher } from './hasher.js';
import { SequentialIds } from './ids.js';
import { MemoryJobQueue } from './job-queue.js';
import { CollectingLogger } from './logger.js';
import { ListOutbox } from './outbox.js';
import { WindowedRateLimiter } from './rate-limiter.js';
import { InMemoryUnitOfWork } from './unit-of-work.js';

export const FAKE_APP_URL = 'http://localhost:3000';
export const FAKE_TERMS_VERSION = '2026-10';

export interface FakeAccountSpec {
  email?: string;
  password?: string;
  status?: AccountStatus;
  username?: string;
  displayName?: string;
  locale?: Locale;
}

export interface FakeAccount {
  accountId: string;
  authUserId: string;
  email: string;
  password: string;
  status: AccountStatus;
  username: string;
}

export function makeCommandPorts() {
  const clock = new FakeClock(new Date('2026-11-01T09:00:00.000Z'));
  const store = new FakeAuthStore();
  const hasher = new FastHasher();
  const accounts = new FakeAccountRepository(store);
  const deliveries = new FakeEmailDeliveryRepository(clock);
  const audit = new ListAuditWriter();
  const outbox = new ListOutbox();
  const jobQueue = new MemoryJobQueue();
  const unitOfWork = new InMemoryUnitOfWork([accounts, deliveries, audit, outbox, jobQueue]);
  const fakes = {
    clock,
    store,
    hasher,
    accounts,
    deliveries,
    audit,
    outbox,
    jobQueue,
    unitOfWork,
    authGateway: new FakeAuthGateway(store, hasher, clock),
    rateLimiter: new WindowedRateLimiter(clock),
    config: new StaticConfigProvider(),
    crypto: new FakeCrypto({ keyByte: 1 }),
    mailCrypto: new FakeCrypto({ keyByte: 2, macSecret: null }),
    ids: new SequentialIds(),
    sleeper: new ClockSleeper(clock),
    logger: new CollectingLogger(),
    afterResponse: new ImmediateAfterResponse(),
  };
  const ports: CommandPorts = {
    ...fakes,
    app: { appUrl: FAKE_APP_URL, termsVersion: FAKE_TERMS_VERSION },
  };

  /** A registered account in both the library's tables and the profile, as the seed makes it. */
  async function addAccount(spec: FakeAccountSpec = {}): Promise<FakeAccount> {
    const n = seq('fake-account');
    const username = spec.username ?? `member_${n}`;
    const email = spec.email ?? `member.${n}@example.test`;
    const password = spec.password ?? 'correct-horse-battery';
    const status = spec.status ?? 'active';
    const hashCalls = hasher.hashCalls;
    const passwordHash = await hasher.hash(password);
    hasher.hashCalls = hashCalls;
    const authUserId = store.nextId('auth-user');
    store.users.set(authUserId, {
      authUserId,
      email,
      passwordHash,
      emailVerified: status !== 'pending_verification',
    });
    const accountId = fakes.ids.newId();
    const tx = {} as never;
    await accounts.createProfile(tx, {
      accountId,
      authUserId,
      username,
      displayName: spec.displayName ?? `Member ${n}`,
      locale: spec.locale ?? 'en',
      ageConfirmedAt: clock.now(),
      termsVersion: FAKE_TERMS_VERSION,
      termsAcceptedAt: clock.now(),
    });
    await accounts.updateStatus(tx, accountId, status);
    await accounts.insertPreferences(tx, { accountId, interfaceLocale: spec.locale ?? 'en' });
    return { accountId, authUserId, email, password, status, username };
  }

  /** Opens a library session for the account and returns what the next request carries. */
  function signInAs(account: FakeAccount, userAgent?: string) {
    const sessionId = fakes.authGateway.openSessionFor(account.authUserId, userAgent ?? null);
    return { sessionId, headers: sessionHeaders(sessionId, userAgent) };
  }

  /** A command call for the actor, with the request's headers, address and session. */
  function callAs(
    actor: Actor,
    request: {
      headers?: RequestHeaders;
      clientAddress?: string | null;
      sessionId?: string | null;
    } = {},
  ): CommandCall {
    return {
      actor,
      request: {
        headers: request.headers ?? sessionHeaders(null),
        clientAddress: request.clientAddress === undefined ? '198.51.100.7' : request.clientAddress,
        sessionId: request.sessionId ?? null,
      },
      ports,
    };
  }

  return { ports, fakes, addAccount, signInAs, callAs };
}

export type FakeCommandWorld = ReturnType<typeof makeCommandPorts>;

/** The Actor `getActor` builds for an account in this status (T-101 BR4.3). */
export function anAccountActor(
  account: Pick<FakeAccount, 'accountId' | 'status'>,
  overrides: Partial<Actor> = {},
): Actor {
  return {
    kind: 'account',
    accountId: account.accountId,
    emailVerified: account.status !== 'pending_verification',
    status: account.status,
    capabilities: [],
    locale: 'en',
    correlationId: 'corr-account',
    ...overrides,
  };
}

export function anAnonymousActor(overrides: Partial<Actor> = {}): Actor {
  return {
    kind: 'anonymous',
    capabilities: [],
    locale: 'en',
    correlationId: 'corr-anon',
    ...overrides,
  };
}
