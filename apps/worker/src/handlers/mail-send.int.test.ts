// T-101 acceptance (FD-071, FD-095): as `rk_worker`, against the compose PostgreSQL test database
// and Mailpit, a queued delivery is sent and marked `sent`, in English and in Bengali. `rk_worker`
// cannot read `auth_users` (CR-006), so a delivery that reached it would fail here. Runs in the
// `worker-int` project after `database` and `test-support-seed`, which migrate and seed the database.
import { createCrypto } from '@rogikotha/adapters';
import { closeDb, createDb } from '@rogikotha/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildContainer, type WorkerContainer } from '../container.js';
import { loadEnv, type WorkerEnv } from '../env.js';

const TEST_KEY = new Uint8Array(32).fill(7);
const RUN = Date.now().toString(36);
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/** `DATABASE_URL_TEST` with `rk_worker`'s credentials, as `packages/database/src/test-setup.ts` derives it. */
function workerUrlForTestDb(testUrl: string): string {
  const url = new URL(testUrl);
  url.username = 'rk_worker';
  url.password = 'rk_worker';
  return url.toString();
}

interface MailpitSummary {
  ID: string;
  Subject: string;
}

async function findMail(to: string): Promise<{ subject: string; text: string } | null> {
  const query = encodeURIComponent(`to:"${to}"`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const search = (await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`)).json()) as {
      messages?: MailpitSummary[];
    };
    const found = search.messages?.[0];
    if (found !== undefined) {
      const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${found.ID}`)).json()) as {
        Text: string;
      };
      return { subject: found.Subject, text: message.Text };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

const testUrl = process.env.DATABASE_URL_TEST ?? '';
const app = createDb(testUrl);
const mailCrypto = createCrypto({ encryptionKey: TEST_KEY });
let worker: WorkerContainer;
let accountId: string;
const inserted: string[] = [];

async function queueDelivery(to: string, locale: 'en' | 'bn'): Promise<string> {
  const sealed = Buffer.from(mailCrypto.encrypt(to));
  const link = `http://localhost:3000/${locale}/verify-email?token=synthetic-${RUN}`;
  const { rows } = await app.pool.query<{ id: string }>(
    `insert into email_deliveries (account_id, to_email_enc, locale, category, message_key, params)
     values ($1, $2, $3, 'verification', 'email.verify', $4) returning id`,
    [accountId, sealed, locale, JSON.stringify({ link })],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('no delivery row was inserted');
  inserted.push(id);
  return id;
}

beforeAll(async () => {
  const base: WorkerEnv = loadEnv({
    ...process.env,
    DATABASE_URL_WORKER: workerUrlForTestDb(testUrl),
    MAIL_RECIPIENT_KEY: Buffer.from(TEST_KEY).toString('base64'),
  });
  worker = buildContainer(base);
  const { rows } = await app.pool.query<{ id: string }>(
    'select id from account_profiles order by created_at limit 1',
  );
  const first = rows[0];
  if (first === undefined) throw new Error('the seeded test database has no account');
  accountId = first.id;
});

afterAll(async () => {
  if (inserted.length > 0) {
    await app.pool.query('delete from email_deliveries where id = any($1::uuid[])', [inserted]);
  }
  await worker.close();
  await closeDb(app.pool);
});

describe('mail.send as rk_worker (FD-071, FD-095)', () => {
  it('runs as a role that cannot read auth_users', async () => {
    const { rows } = await app.pool.query<{ allowed: boolean }>(
      "select has_table_privilege('rk_worker', 'auth_users', 'select') as allowed",
    );

    expect(rows[0]?.allowed).toBe(false);
  });

  it.each([
    ['en', 'Confirm your RogiKotha email'],
    ['bn', 'আপনার রোগীকথা ইমেইল নিশ্চিত করুন'],
  ] as const)(
    'delivers a queued %s verification email and marks it sent',
    async (locale, subject) => {
      const to = `shirin.demo+${RUN}-${locale}@example.test`;
      const deliveryId = await queueDelivery(to, locale);

      await worker.sendEmail({ deliveryId });

      const { rows } = await app.pool.query<{
        status: string;
        params: unknown;
        sent_at: Date | null;
      }>('select status, params, sent_at from email_deliveries where id = $1', [deliveryId]);
      expect(rows[0]?.status).toBe('sent');
      expect(rows[0]?.params).toEqual({});
      expect(rows[0]?.sent_at).not.toBeNull();

      const mail = await findMail(to);
      expect(mail?.subject).toBe(subject);
      expect(mail?.text).toContain(`/${locale}/verify-email?token=synthetic-${RUN}`);
    },
  );
});
