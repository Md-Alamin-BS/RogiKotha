// U41 plan Step 34, adversarial A4 and A5 (design § 8.5) against the real container and the
// assigned test database. A4 drives the error paths that carry user text (a duplicate username,
// an over-long title, an invalid id, a port that throws `LOGSCRUB-THROW-7Q`, a slot failure, a
// cast with free text and an interpolated event); A5 uses a real session cookie on cross-site and
// Origin-less uploads and checks that no row is written. Written by a separate agent to break the
// Unit; every value is synthetic.
//
// Needs `pnpm infra:up`, the repo-root `.env`, and the `database` and `test-support-seed`
// projects run first on a fresh test database, as the `test:int` groups do.
// ASSUMPTION(U41): the plan names `server/security.adversarial.int.test.ts`, but `web-server` may
// not import the upload route or the server actions; the file sits in the `web` element, as
// `log-scrub.int.test.ts` does (ISS-693).
import {
  registerCommand,
  signInCommand,
  verifyEmailCommand,
  type CommandPorts,
  type CommandRequest,
  type LogFields,
} from '@rogikotha/application';
import { ANONYMOUS_ACTOR, newId, type Actor, type DraftPayloadInput } from '@rogikotha/contracts';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type * as AuthModule from '@/server/auth';
import type { WebContainer } from '@/server/container';
import { optionalEnv } from '@/server/env';

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(request.headers) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('bn') }));

const RUN = Date.now().toString(36);
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 60_000;
const MARKER = 'LOGSCRUB-THROW-7Q';
const EMAIL = `rumi.adversarial.demo+${RUN}@example.test`;
const SECOND_EMAIL = `logscrub.throw.demo+${RUN}@example.test`;
const PASSWORD = 'another synthetic secret 2026';
const USERNAME = `rumi_${RUN}`;
const ORIGIN = 'http://localhost:3000';
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 2, 0, 0, 0, 0x90, 0x77, 0x53, 0xde,
]);

let container: WebContainer;
let auth: typeof AuthModule;
let storageRoot: string;
let addressSeq = 0;
let actor: Actor;
let sessionCookie = '';
let reviewPublicId = '';
const captured: string[] = [];

function freshRequest(): CommandRequest {
  addressSeq += 1;
  const address = `198.51.100.${100 + addressSeq}`;
  return {
    headers: new Headers({ 'x-forwarded-for': address }),
    clientAddress: address,
    sessionId: null,
  };
}

function call(as: Actor, ports: CommandPorts = container.ports) {
  return { actor: as, request: freshRequest(), ports };
}

function anonymous(): Actor {
  return ANONYMOUS_ACTOR('bn', newId());
}

async function db() {
  const { getDb } = await import('@/server/db');
  return getDb().$client;
}

async function confirmationToken(accountId: string): Promise<string> {
  const { rows } = await (
    await db()
  ).query<{ params: { link: string } }>(
    `select params from email_deliveries
     where account_id = $1 and message_key = 'email.verify' order by created_at desc limit 1`,
    [accountId],
  );
  const token = rows[0] ? new URL(rows[0].params.link).searchParams.get('token') : null;
  if (!token) throw new Error('no confirmation link was queued');
  return token;
}

async function evidenceRows(): Promise<number> {
  const { rows } = await (
    await db()
  ).query<{ n: number }>('select count(*)::int as n from evidence_items');
  return rows[0]?.n ?? -1;
}

async function upload(headers: Record<string, string | null>): Promise<Response> {
  const { POST } = await import('@/app/api/evidence/upload/route');
  const form = new FormData();
  form.set('reviewPublicId', reviewPublicId);
  form.set('idempotencyKey', newId());
  form.set('file', new File([PNG_BYTES], 'synthetic-a5.png', { type: 'image/png' }));
  const encoded = new Response(form);
  const body = await encoded.arrayBuffer();
  const all = new Headers();
  const wanted: Record<string, string | null> = {
    'content-type': encoded.headers.get('content-type'),
    'content-length': String(body.byteLength),
    host: 'localhost:3000',
    cookie: sessionCookie,
    ...headers,
  };
  for (const [name, value] of Object.entries(wanted)) if (value !== null) all.set(name, value);
  return POST(new Request(`${ORIGIN}/api/evidence/upload`, { method: 'POST', body, headers: all }));
}

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  storageRoot = await mkdtemp(path.join(os.tmpdir(), 'rk-u41-adversarial-int-'));
  process.env.STORAGE_ROOT = storageRoot;
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    });
  }
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    captured.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    captured.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  });
  container = (await import('@/server/container')).getContainer();
  auth = await import('@/server/auth');
}, SLOW);

afterAll(async () => {
  vi.restoreAllMocks();
  await (await db()).end();
  await rm(storageRoot, { recursive: true, force: true });
});

describe('U41 adversarial A4 and A5 against the real container', () => {
  it(
    'sets up a confirmed, signed-in synthetic account with one published review',
    async () => {
      const registered = await registerCommand.execute(
        {
          email: EMAIL,
          password: PASSWORD,
          username: USERNAME,
          displayName: 'Rumi Adversarial',
          locale: 'bn',
          ageConfirmed: true,
          termsAccepted: true,
        },
        call(anonymous()),
      );
      if (!registered.ok) throw new Error(`register failed: ${registered.error.code}`);
      const verified = await verifyEmailCommand.execute(
        { token: await confirmationToken(registered.data.accountId) },
        call(anonymous()),
      );
      expect(verified.ok).toBe(true);
      const signedIn = await signInCommand.execute(
        { email: EMAIL, password: PASSWORD },
        call(anonymous()),
      );
      if (!signedIn.ok || signedIn.data.session.kind !== 'set') throw new Error('no session');
      sessionCookie = signedIn.data.session.setCookies
        .map((value) => value.split(';')[0])
        .join('; ');
      request.headers = new Headers({ cookie: sessionCookie });
      actor = (await auth.getRequestContext()).actor;
      expect(actor).toMatchObject({ kind: 'account', emailVerified: true });

      const payload: DraftPayloadInput = {
        target: 'doctor',
        mode: 'quick',
        relationship: 'self',
        period: { year: 2025, month: 6 },
        story: 'A synthetic visit for the adversarial run: the clinic was calm and the wait short.',
        notSure: true,
        title: 'A synthetic adversarial visit',
        newDoctor: { name: `Dr. Synthetic Adversary ${RUN_LETTERS}` },
        identityMode: 'named',
      };
      const saved = await container.review.saveDraft.execute({ payload }, call(actor));
      if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
      const published = await container.review.publish.execute(
        { draftId: saved.data.draftId, identityMode: 'named', attestation: true },
        call(actor),
      );
      if (!published.ok) throw new Error(`publish failed: ${published.error.code}`);
      reviewPublicId = published.data.publicId;
    },
    SLOW,
  );

  it(
    'A4: a duplicate username, an over-long title and an invalid id are refused by code',
    async () => {
      const duplicate = await registerCommand.execute(
        {
          email: SECOND_EMAIL,
          password: `${MARKER} ${PASSWORD}`,
          username: USERNAME,
          displayName: `${MARKER} duplicate`,
          locale: 'en',
          ageConfirmed: true,
          termsAccepted: true,
        },
        call(anonymous()),
      );
      const longTitle = await container.review.saveDraft.execute(
        {
          payload: {
            target: 'doctor',
            mode: 'quick',
            relationship: 'self',
            period: { year: 2025, month: 6 },
            story: `${MARKER} story`,
            notSure: true,
            title: `${MARKER} ${'দীর্ঘ শিরোনাম '.repeat(60)}`,
            newDoctor: { name: `Dr. ${MARKER}` },
            identityMode: 'named',
          },
        },
        call(actor),
      );
      const badId = await container.review.getHistory.execute(
        { reviewPublicId: MARKER },
        call(actor),
      );

      // A duplicate username may answer neutrally (no enumeration), but never with the input.
      expect(JSON.stringify(duplicate)).not.toContain(MARKER);
      expect(longTitle.ok).toBe(false);
      expect(badId.ok).toBe(false);
    },
    SLOW,
  );

  it(
    'A4: a port that throws the marker gives command.failed with the command name only',
    async () => {
      const throwing: CommandPorts = {
        ...container.ports,
        unitOfWork: {
          run: () => Promise.reject(new Error(MARKER)),
          read: () => Promise.reject(new Error(MARKER)),
        },
      };
      const result = await container.review.getHistory.execute(
        { reviewPublicId },
        call(actor, throwing),
      );

      expect(result).toMatchObject({ ok: false, error: { code: 'internal' } });
      expect(captured.join('\n')).toContain('command.failed');
    },
    SLOW,
  );

  it('A4: a slot failure and a cast with free text and an interpolated event write no marker', async () => {
    const { logSlotFailure } = await import('@/server/actions/review-slots');
    logSlotFailure('history', new Error(MARKER));
    container.ports.logger.error(`review.published for ${MARKER}`, {
      command: `${MARKER} said hello`,
      reviewBody: MARKER,
      message: MARKER,
      stack: `Error: ${MARKER}\n    at x`,
    } as unknown as LogFields);
    expect(captured.join('\n')).toContain('log.invalid_event');
  });

  it(
    'A5: a real session cookie on a cross-site or Origin-less upload writes no row',
    async () => {
      const before = await evidenceRows();
      const crossSite = await upload({
        origin: 'http://127.0.0.1:3129',
        'sec-fetch-site': 'cross-site',
      });
      const opaque = await upload({ origin: 'null', 'sec-fetch-site': 'cross-site' });
      const noOrigin = await upload({ origin: null, 'sec-fetch-site': 'same-site' });
      expect([crossSite.status, opaque.status, noOrigin.status]).toEqual([403, 403, 403]);
      expect(await evidenceRows()).toBe(before);

      // The control: the same cookie from the app's own origin is accepted.
      const own = await upload({ origin: ORIGIN, 'sec-fetch-site': 'same-origin' });
      expect(own.status).toBe(200);
      expect(await evidenceRows()).toBe(before + 1);
    },
    SLOW,
  );

  it('A4: nothing written holds the marker, the addresses or the password', () => {
    const text = captured.join('\n');
    for (const leak of [MARKER, 'LOGSCRUB', '@example.test', 'rumi.adversarial', PASSWORD]) {
      expect(text, leak).not.toContain(leak);
    }
  });
});
