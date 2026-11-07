// U41 plan Step 32 (`web-int`, design § 8.2, BR6.6): the web logger under real flows. A synthetic
// account registers, confirms, signs in, publishes a review and a comment holding text markers,
// uploads a file whose name is a marker, and hits two refusals; one call passes a token through a
// cast. No marker, address, file-name part or token may reach the console or stdout.
//
// Needs `pnpm infra:up`, the repo-root `.env`, and the `database` and `test-support-seed`
// projects run first on a fresh test database, as the `test:int` groups do.
// ASSUMPTION(U41): the design names `server/log-scrub.int.test.ts`, but `web-server` may not import
// the upload route in `app/`; the file sits in the `web` element, as `security-cookies.test.ts` does.
import {
  registerCommand,
  signInCommand,
  verifyEmailCommand,
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
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));

const RUN = Date.now().toString(36);
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 60_000;
const EMAIL = `mitu.logscrub.demo+${RUN}@example.test`;
const PASSWORD = 'a synthetic secret 2026';
const MARKER_EN = 'LOGSCRUB-EN-7Q';
const MARKER_BN = 'লগস্ক্রাব-বাংলা';
const FILE_NAME = 'logscrub-রিপোর্ট-7Q.png';
// 40 letters and digits: the shape of a session token or an API key.
const TOKEN = 'Q7x9LogScrubTokenAbCdEf0123456789GhIjKl';
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
let reviewPublicId: string;
const captured: string[] = [];

function freshRequest(): CommandRequest {
  addressSeq += 1;
  const address = `198.51.100.${200 + addressSeq}`;
  return {
    headers: new Headers({ 'x-forwarded-for': address }),
    clientAddress: address,
    sessionId: null,
  };
}

function call(as: Actor) {
  return { actor: as, request: freshRequest(), ports: container.ports };
}

function cookieHeaderOf(setCookies: readonly string[]): string {
  return setCookies.map((value) => value.split(';')[0]).join('; ');
}

async function confirmationToken(accountId: string): Promise<string> {
  const { getDb } = await import('@/server/db');
  const { rows } = await getDb().$client.query<{ params: { link: string } }>(
    `select params from email_deliveries
     where account_id = $1 and message_key = 'email.verify' order by created_at desc limit 1`,
    [accountId],
  );
  const token = rows[0] ? new URL(rows[0].params.link).searchParams.get('token') : null;
  if (!token) throw new Error('no confirmation link was queued');
  return token;
}

async function uploadRequest(fields: { reviewPublicId: string; contentLength?: string }) {
  const form = new FormData();
  form.set('reviewPublicId', fields.reviewPublicId);
  form.set('idempotencyKey', newId());
  form.set('file', new File([PNG_BYTES], FILE_NAME, { type: 'image/png' }));
  const encoded = new Response(form);
  const body = await encoded.arrayBuffer();
  return new Request(`${ORIGIN}/api/evidence/upload`, {
    method: 'POST',
    body,
    headers: {
      'content-type': encoded.headers.get('content-type') ?? '',
      'content-length': fields.contentLength ?? String(body.byteLength),
      origin: ORIGIN,
      host: 'localhost:3000',
    },
  });
}

beforeAll(async () => {
  // The container reads DATABASE_URL and STORAGE_ROOT; both point at this run's own places.
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  storageRoot = await mkdtemp(path.join(os.tmpdir(), 'rk-u41-log-scrub-int-'));
  process.env.STORAGE_ROOT = storageRoot;
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    });
  }
  // The web logger writes info lines to stdout directly.
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
  const { getDb } = await import('@/server/db');
  await getDb().$client.end();
  await rm(storageRoot, { recursive: true, force: true });
});

describe('the web logger under real flows (BR6.6)', () => {
  it(
    'registers, confirms and signs in the synthetic account',
    async () => {
      const registered = await registerCommand.execute(
        {
          email: EMAIL,
          password: PASSWORD,
          username: `mitu_${RUN}`,
          displayName: 'Mitu Logscrub',
          locale: 'en',
          ageConfirmed: true,
          termsAccepted: true,
        },
        call(ANONYMOUS_ACTOR('en', newId())),
      );
      if (!registered.ok) throw new Error(`register failed: ${registered.error.code}`);
      const verified = await verifyEmailCommand.execute(
        { token: await confirmationToken(registered.data.accountId) },
        call(ANONYMOUS_ACTOR('en', newId())),
      );
      expect(verified.ok).toBe(true);

      const signedIn = await signInCommand.execute(
        { email: EMAIL, password: PASSWORD },
        call(ANONYMOUS_ACTOR('en', newId())),
      );
      if (!signedIn.ok || signedIn.data.session.kind !== 'set') throw new Error('no session');
      request.headers = new Headers({ cookie: cookieHeaderOf(signedIn.data.session.setCookies) });
      const context = await auth.getRequestContext();
      expect(context.actor).toMatchObject({ kind: 'account', emailVerified: true });
      actor = context.actor;
    },
    SLOW,
  );

  it(
    'publishes a review and a comment that hold the English and Bengali markers',
    async () => {
      const payload: DraftPayloadInput = {
        target: 'doctor',
        mode: 'quick',
        relationship: 'self',
        period: { year: 2025, month: 5 },
        story: `A synthetic visit, ${MARKER_EN}: the doctor explained each dose slowly. ${MARKER_BN}`,
        notSure: true,
        title: `A synthetic visit ${MARKER_EN}`,
        newDoctor: { name: `Dr. Synthetic Logscrub ${RUN_LETTERS}` },
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

      const comment = await container.community.postComment.execute(
        { reviewPublicId, body: `${MARKER_EN} ${MARKER_BN}` },
        call(actor),
      );
      expect(comment.ok).toBe(true);
    },
    SLOW,
  );

  it(
    'uploads the marker-named file, then an over-limit request and one for an unknown review',
    async () => {
      const { POST } = await import('@/app/api/evidence/upload/route');

      const uploaded = await POST(await uploadRequest({ reviewPublicId }));
      const overLimit = await POST(
        await uploadRequest({ reviewPublicId, contentLength: '15794177' }),
      );
      const unknown = await POST(await uploadRequest({ reviewPublicId: 'zzzzzzzzzz' }));

      expect(uploaded.status).toBe(200);
      expect(overLimit.status).toBe(413);
      expect(unknown.status).toBe(404);
    },
    SLOW,
  );

  it('drops or scrubs a token passed through a cast', () => {
    container.ports.logger.warn('scrub.cast_check', {
      accountId: TOKEN,
      reviewBody: TOKEN,
    } as unknown as LogFields);
  });

  it('wrote lines, and none holds an address, a marker, a file-name part or the token', () => {
    const text = captured.join('\n');

    // The capture worked: the over-limit refusal and the cast line were both written.
    expect(text).toContain('security.request_refused');
    expect(text).toContain('scrub.cast_check');
    for (const leak of [
      '@example.test',
      'mitu.logscrub',
      MARKER_EN,
      MARKER_BN,
      'লগস্ক্রাব',
      'logscrub-',
      'রিপোর্ট',
      '7Q.png',
      TOKEN,
      PASSWORD,
    ]) {
      expect(text, leak).not.toContain(leak);
    }
  });
});
