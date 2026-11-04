// T-101 smoke (team practice: one assertion per Unit): a new account registered through
// `account.register` and confirmed through `account.verifyEmail` is a verified account Actor on
// its next request. Real container against the compose test database (`web-int`, group 3).
import { registerCommand, verifyEmailCommand } from '@rogikotha/application';
import { ANONYMOUS_ACTOR, newId } from '@rogikotha/contracts';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import type { WebContainer } from './container';
import { optionalEnv } from './env';

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(request.headers) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));

const RUN = Date.now().toString(36);

let container: WebContainer;

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  container = (await import('./container')).getContainer();
});

afterAll(async () => {
  const { getDb } = await import('./db');
  await getDb().$client.end();
});

it('turns a registration and its confirmation link into a verified account Actor', async () => {
  const call = () => ({
    actor: ANONYMOUS_ACTOR('en', newId()),
    request: { headers: new Headers(), clientAddress: '203.0.113.7', sessionId: null },
    ports: container.ports,
  });
  const registered = await registerCommand.execute(
    {
      email: `smoke.demo+${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username: `smoke_${RUN}`,
      displayName: 'Smoke Demo',
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    },
    call(),
  );
  if (!registered.ok) throw new Error(`register failed: ${registered.error.code}`);
  const { rows } = await (await import('./db')).getDb().$client.query<{ link: string }>(
    `select params->>'link' as link from email_deliveries
     where account_id = $1 and message_key = 'email.verify' limit 1`,
    [registered.data.accountId],
  );
  const token = rows[0] ? new URL(rows[0].link).searchParams.get('token') : null;

  const verified = await verifyEmailCommand.execute({ token }, call());
  if (!verified.ok || verified.data.session.kind !== 'set') throw new Error('verify set no cookie');
  request.headers = new Headers({
    cookie: verified.data.session.setCookies.map((c) => c.split(';')[0]).join('; '),
  });
  const { getActor } = await import('./auth');

  expect(await getActor()).toMatchObject({
    kind: 'account',
    accountId: registered.data.accountId,
    emailVerified: true,
  });
}, 60_000);
