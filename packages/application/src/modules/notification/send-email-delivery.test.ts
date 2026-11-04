import type { Locale } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  CollectingLogger,
  FakeClock,
  FakeCrypto,
  FakeEmailDeliveryRepository,
  InMemoryUnitOfWork,
  RecordingMailTransport,
} from '../../fakes-test-support';
import type { EmailCatalog, EmailMessageKey } from '../../ports';
import { emailCatalogFromMessages } from './email-catalog';
import { MAIL_SEND_MAX_ATTEMPTS, sendEmailDelivery } from './send-email-delivery';

const tx = {} as never;
const LINK = 'http://localhost:3000/bn/verify-email?token=abc';

const catalog: EmailCatalog = emailCatalogFromMessages({
  en: { email: { verify: { subject: 'Confirm your email', body: 'Open {link}' } } },
  bn: { email: { verify: { subject: 'ইমেইল নিশ্চিত করুন', body: 'খুলুন {link}' } } },
});

function setUp() {
  const clock = new FakeClock();
  const deliveries = new FakeEmailDeliveryRepository(clock);
  const mailCrypto = new FakeCrypto({ keyByte: 2, macSecret: null });
  const transport = new RecordingMailTransport();
  const logger = new CollectingLogger();
  const deps = {
    unitOfWork: new InMemoryUnitOfWork([deliveries]),
    deliveries,
    mailCrypto,
    transport,
    catalog,
    clock,
    logger,
  };
  async function queued(
    overrides: {
      locale?: Locale;
      messageKey?: EmailMessageKey;
      params?: Record<string, string>;
      sealed?: Uint8Array;
    } = {},
  ) {
    const id = `delivery-${deliveries.all().length + 1}`;
    await deliveries.insert(tx, {
      id,
      accountId: 'account-1',
      toEmailEnc: overrides.sealed ?? mailCrypto.encrypt('shirin.demo@example.test'),
      locale: overrides.locale ?? 'bn',
      category: 'verification',
      messageKey: overrides.messageKey ?? 'email.verify',
      params: overrides.params ?? { link: LINK },
      dedupeKey: null,
    });
    return id;
  }
  const row = async (id: string) => deliveries.findById(tx, id);
  return { deps, transport, logger, queued, row };
}

describe('sendEmailDelivery', () => {
  it('sends the email in the row locale, marks it sent and clears the link', async () => {
    const { deps, transport, logger, queued, row } = setUp();
    const id = await queued();

    const outcome = await sendEmailDelivery({ deliveryId: id }, deps);

    expect(outcome).toEqual({ status: 'sent' });
    expect(transport.sent).toEqual([
      { to: 'shirin.demo@example.test', subject: 'ইমেইল নিশ্চিত করুন', text: `খুলুন ${LINK}` },
    ]);
    expect(await row(id)).toMatchObject({ status: 'sent', attempts: 1, params: {} });
    expect(logger.entries).toEqual([
      {
        level: 'info',
        event: 'mail.sent',
        fields: { deliveryId: id, messageKey: 'email.verify', status: 'sent' },
      },
    ]);
  });

  it('never sends a row twice', async () => {
    const { deps, transport, queued } = setUp();
    const id = await queued();
    await sendEmailDelivery({ deliveryId: id }, deps);

    const again = await sendEmailDelivery({ deliveryId: id }, deps);
    const missing = await sendEmailDelivery({ deliveryId: 'delivery-404' }, deps);

    expect([again, missing]).toEqual([{ status: 'skipped' }, { status: 'skipped' }]);
    expect(transport.sent).toHaveLength(1);
  });

  it('asks for a retry on a transient error and stays queued with the error code', async () => {
    const { deps, transport, queued, row } = setUp();
    const id = await queued();
    transport.failWith('smtp_unavailable');

    const outcome = await sendEmailDelivery({ deliveryId: id }, deps);

    expect(outcome).toEqual({ status: 'retry', errorCode: 'smtp_unavailable', attempts: 1 });
    expect(await row(id)).toMatchObject({
      status: 'queued',
      attempts: 1,
      lastErrorCode: 'smtp_unavailable',
    });
  });

  it('fails for good at the sixth error and clears the link', async () => {
    const { deps, transport, queued, row } = setUp();
    const id = await queued();
    transport.failWith(
      ...Array.from({ length: MAIL_SEND_MAX_ATTEMPTS }, () => 'smtp_timeout' as const),
    );

    const outcomes = [];
    for (let i = 0; i < MAIL_SEND_MAX_ATTEMPTS; i += 1) {
      outcomes.push((await sendEmailDelivery({ deliveryId: id }, deps)).status);
    }

    expect(outcomes).toEqual(['retry', 'retry', 'retry', 'retry', 'retry', 'failed']);
    expect(await row(id)).toMatchObject({
      status: 'failed',
      lastErrorCode: 'smtp_timeout',
      params: {},
    });
  });

  it('fails without sending when the recipient does not open with the mail key', async () => {
    const { deps, transport, queued, row } = setUp();
    const sealedWithAppKey = new FakeCrypto({ keyByte: 1 }).encrypt('shirin.demo@example.test');
    const id = await queued({ sealed: sealedWithAppKey });

    const outcome = await sendEmailDelivery({ deliveryId: id }, deps);

    expect(outcome).toEqual({ status: 'failed', errorCode: 'decrypt_failed' });
    expect(transport.sent).toEqual([]);
    expect(await row(id)).toMatchObject({ status: 'failed', params: {} });
  });

  it('fails a missing template and params outside the allowlist', async () => {
    const { deps, transport, queued } = setUp();
    const noTemplate = await queued({ messageKey: 'email.reset' });
    const badParams = await queued({ params: { link: LINK, name: 'Shirin' } });

    const outcomes = [
      await sendEmailDelivery({ deliveryId: noTemplate }, deps),
      await sendEmailDelivery({ deliveryId: badParams }, deps),
    ];

    expect(outcomes).toEqual([
      { status: 'failed', errorCode: 'template_missing' },
      { status: 'failed', errorCode: 'params_invalid' },
    ]);
    expect(transport.sent).toEqual([]);
  });

  it.each([null, 'delivery-1', { deliveryId: 7 }, { deliveryId: 'd', email: 'x@example.test' }])(
    'finishes without a retry for the payload %j',
    async (payload) => {
      const { deps, logger } = setUp();

      const outcome = await sendEmailDelivery(payload, deps);

      expect(outcome).toEqual({ status: 'failed', errorCode: 'payload_invalid' });
      expect(logger.events()).toEqual(['mail.payload_invalid']);
    },
  );

  it('logs no address, link or subject on any outcome', async () => {
    const { deps, transport, logger, queued } = setUp();
    transport.failWith('smtp_rejected');
    const id = await queued();

    await sendEmailDelivery({ deliveryId: id }, deps);
    await sendEmailDelivery({ deliveryId: id }, deps);

    const logged = JSON.stringify(logger.entries);
    expect(logged).not.toContain('@');
    expect(logged).not.toContain('token=');
  });
});

describe('emailCatalogFromMessages', () => {
  it('collects every nested subject and body under its dotted key, per locale', () => {
    const built = emailCatalogFromMessages({
      en: {
        email: { security: { passwordChanged: { subject: 'S', body: 'B {link}' } } },
        other: {},
      },
      bn: null,
    });

    expect(built).toEqual({
      en: { 'email.security.passwordChanged': { subject: 'S', body: 'B {link}' } },
      bn: {},
    });
  });
});
