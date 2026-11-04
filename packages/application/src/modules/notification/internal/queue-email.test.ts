import { describe, expect, it } from 'vitest';

import { FAKE_APP_URL, makeCommandPorts } from '../../../fakes-test-support';
import { createRecipientDirectory } from '../../account/recipient-directory';
import { queueEmail, type QueueEmailInput } from './queue-email';

const tx = {} as never;

async function setUp(status: 'active' | 'deleted' = 'active') {
  const world = makeCommandPorts();
  const account = await world.addAccount({
    status,
    locale: 'bn',
    email: 'shirin.demo@example.test',
  });
  const { fakes, ports } = world;
  const queuePorts = {
    recipients: createRecipientDirectory({
      accounts: fakes.accounts,
      mailCrypto: fakes.mailCrypto,
    }),
    deliveries: fakes.deliveries,
    jobQueue: fakes.jobQueue,
    ids: fakes.ids,
    app: ports.app,
  };
  const input = (overrides: Partial<QueueEmailInput> = {}): QueueEmailInput => ({
    accountId: account.accountId,
    category: 'security',
    messageKey: 'email.security.passwordChanged',
    params: (locale) => ({ link: `${FAKE_APP_URL}/${locale}/reset-password` }),
    ...overrides,
  });
  return { world, account, queuePorts, input };
}

describe('queueEmail', () => {
  it('writes the delivery and its mail.send job, keyed per delivery, in the recipient locale', async () => {
    const { world, account, queuePorts, input } = await setUp();

    const result = await queueEmail(queuePorts, tx, input());

    const [delivery] = world.fakes.deliveries.all();
    expect(result).toEqual({ ok: true, data: { kind: 'queued', deliveryId: delivery?.id } });
    expect(delivery).toMatchObject({
      accountId: account.accountId,
      locale: 'bn',
      status: 'queued',
      params: { link: `${FAKE_APP_URL}/bn/reset-password` },
    });
    expect(world.fakes.jobQueue.enqueued).toEqual([
      {
        name: 'mail.send',
        payload: { deliveryId: delivery?.id },
        key: `mail.send:${delivery?.id}`,
      },
    ]);
  });

  it('carries only ciphertext under the mail key, and no address in the job payload', async () => {
    const { world, queuePorts, input } = await setUp();

    await queueEmail(queuePorts, tx, input());

    const sealed = world.fakes.deliveries.all()[0]?.toEmailEnc ?? new Uint8Array();
    expect(world.fakes.mailCrypto.decryptText(sealed).ok).toBe(true);
    expect(world.fakes.crypto.decryptText(sealed).ok).toBe(false);
    expect(JSON.stringify(world.fakes.jobQueue.enqueued)).not.toContain('@');
  });

  it('queues a dedupe key only once', async () => {
    const { world, queuePorts, input } = await setUp();

    const first = await queueEmail(queuePorts, tx, input({ dedupeKey: 'reset-notice-1' }));
    const second = await queueEmail(queuePorts, tx, input({ dedupeKey: 'reset-notice-1' }));

    expect(second).toEqual({
      ok: true,
      data: {
        kind: 'deduplicated',
        deliveryId: first.ok && 'deliveryId' in first.data ? first.data.deliveryId : '',
      },
    });
    expect(world.fakes.deliveries.all()).toHaveLength(1);
  });

  it('suppresses the email of a deleted account and writes nothing', async () => {
    const { world, queuePorts, input } = await setUp('deleted');

    const result = await queueEmail(queuePorts, tx, input());

    expect(result).toEqual({ ok: true, data: { kind: 'suppressed' } });
    expect(world.fakes.deliveries.all()).toEqual([]);
    expect(world.fakes.jobQueue.enqueued).toEqual([]);
  });

  it.each([
    ['a second param', { link: `${FAKE_APP_URL}/en/sign-in`, name: 'Shirin' }],
    ['a link outside APP_URL', { link: 'https://elsewhere.example.test/en/sign-in' }],
    ['no link', {}],
  ])('refuses %s as a programmer error', async (_name, params) => {
    const { queuePorts, input } = await setUp();

    await expect(queueEmail(queuePorts, tx, input({ params }))).rejects.toThrow(/params refused/);
  });

  it('answers internal when the job cannot be enqueued, so the caller rolls back', async () => {
    const { world, queuePorts, input } = await setUp();
    world.fakes.jobQueue.refuseEnqueues(1);

    const result = await queueEmail(queuePorts, tx, input({ correlationId: 'corr-q' }));

    expect(result.ok ? null : result.error).toMatchObject({
      code: 'internal',
      correlationId: 'corr-q',
    });
  });
});
