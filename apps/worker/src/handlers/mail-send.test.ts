import { describe, expect, it } from 'vitest';

import { mailSendHandler } from './mail-send.js';
import type { MailSendContext, MailSendJob } from './mail-send.js';

interface LogLine {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: Record<string, unknown> | undefined;
}

/** A handler context whose use case records each job it was given, or fails with `failWith`. */
function aContext(failWith?: Error): MailSendContext & { sent: MailSendJob[]; logs: LogLine[] } {
  const sent: MailSendJob[] = [];
  const logs: LogLine[] = [];
  const log =
    (level: LogLine['level']) =>
    (event: string, fields?: Record<string, unknown>): void => {
      logs.push({ level, event, fields });
    };
  return {
    sent,
    logs,
    logger: { info: log('info'), warn: log('warn'), error: log('error') },
    sendEmail: (job) => {
      if (failWith !== undefined) return Promise.reject(failWith);
      sent.push(job);
      return Promise.resolve();
    },
  };
}

const DELIVERY_ID = '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a01';

describe('mailSendHandler', () => {
  it('hands the delivery id of a well-formed job to the use case', async () => {
    const ctx = aContext();

    await mailSendHandler({ deliveryId: DELIVERY_ID }, ctx);

    expect(ctx.sent).toEqual([{ deliveryId: DELIVERY_ID }]);
    expect(ctx.logs).toEqual([]);
  });

  it('passes only the delivery id on, whatever else the job carries', async () => {
    const ctx = aContext();

    await mailSendHandler({ deliveryId: DELIVERY_ID, to: 'shirin.demo@example.test' }, ctx);

    expect(ctx.sent).toEqual([{ deliveryId: DELIVERY_ID }]);
  });

  it('rethrows the use case retry signal so pg-boss retries the job', async () => {
    const retry = new Error('mail.send retry: smtp_unavailable');
    const ctx = aContext(retry);

    await expect(mailSendHandler({ deliveryId: DELIVERY_ID }, ctx)).rejects.toBe(retry);
  });

  it.each([
    ['no payload', undefined],
    ['a payload without a delivery id', {}],
    ['a delivery id that is not a uuid', { deliveryId: 'not-a-uuid' }],
    ['a delivery id that is not a string', { deliveryId: 42 }],
  ])('finishes without sending or retrying for %s', async (_case, payload) => {
    const ctx = aContext();

    await expect(mailSendHandler(payload, ctx)).resolves.toBeUndefined();

    expect(ctx.sent).toEqual([]);
    expect(ctx.logs).toEqual([
      { level: 'warn', event: 'mail.payload_invalid', fields: { job: 'mail.send' } },
    ]);
  });
});
