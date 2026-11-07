import type { JobAttempt } from '@rogikotha/database';
import type { ProcessEvidenceInput } from '@rogikotha/application/worker';
import { describe, expect, it } from 'vitest';

import { EVIDENCE_ATTEMPT_BUDGET_MS, evidenceProcessHandler } from './evidence-process.js';
import type { EvidenceProcessContext } from './evidence-process.js';

const ITEM_ID = '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a11';
const EVENT_ID = '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a12';
const ENVELOPE = { eventId: EVENT_ID, name: 'evidence.received', payload: { itemId: ITEM_ID } };

interface LogLine {
  level: string;
  event: string;
  fields: Record<string, unknown> | undefined;
}

/** A context whose processor records each input, or fails with `failWith`. */
function aContext(failWith?: Error): EvidenceProcessContext & {
  inputs: ProcessEvidenceInput[];
  logs: LogLine[];
} {
  const inputs: ProcessEvidenceInput[] = [];
  const logs: LogLine[] = [];
  const log =
    (level: string) =>
    (event: string, fields?: Record<string, unknown>): void => {
      logs.push({ level, event, fields });
    };
  return {
    inputs,
    logs,
    logger: { info: log('info'), warn: log('warn'), error: log('error') },
    processEvidence: (input) => {
      inputs.push(input);
      if (failWith !== undefined) return Promise.reject(failWith);
      return Promise.resolve({ state: 'preview_ready' });
    },
  };
}

function anAttempt(retryCount: number, signal = new AbortController().signal): JobAttempt {
  return { jobId: 'job-1', retryCount, retryLimit: 3, signal };
}

describe('evidenceProcessHandler', () => {
  it('hands the item id of a well-formed envelope to the processor as attempt 1 at retryCount 0', async () => {
    const ctx = aContext();

    await evidenceProcessHandler(ENVELOPE, ctx, anAttempt(0));

    expect(ctx.inputs).toHaveLength(1);
    expect(ctx.inputs[0]).toMatchObject({ itemId: ITEM_ID, attempt: 1, lastAttempt: false });
  });

  it('marks the attempt at retryCount 3 of a retryLimit of 3 as attempt 4 and the last one', async () => {
    const ctx = aContext();

    await evidenceProcessHandler(ENVELOPE, ctx, anAttempt(3));

    expect(ctx.inputs[0]).toMatchObject({ itemId: ITEM_ID, attempt: 4, lastAttempt: true });
  });

  it('keeps the attempt before the last one open for a retry', async () => {
    const ctx = aContext();

    await evidenceProcessHandler(ENVELOPE, ctx, anAttempt(2));

    expect(ctx.inputs[0]).toMatchObject({ attempt: 3, lastAttempt: false });
  });

  it('finishes a malformed envelope with a warning and never calls the processor', async () => {
    const ctx = aContext();

    await evidenceProcessHandler({ eventId: EVENT_ID, payload: { itemId: 'not-a-uuid' } }, ctx);

    expect(ctx.inputs).toEqual([]);
    expect(ctx.logs).toEqual([
      { level: 'warn', event: 'evidence.payload_invalid', fields: { job: 'evidence.process' } },
    ]);
  });

  it.each([undefined, null, 'x', {}, { ...ENVELOPE, name: 'review.published' }])(
    'finishes the job data %j without a retry',
    async (payload) => {
      const ctx = aContext();

      await expect(evidenceProcessHandler(payload, ctx, anAttempt(0))).resolves.toBeUndefined();

      expect(ctx.inputs).toEqual([]);
    },
  );

  it('does not log the job data of a malformed envelope', async () => {
    const ctx = aContext();

    await evidenceProcessHandler({ payload: { itemId: 'private-looking-value' } }, ctx);

    expect(JSON.stringify(ctx.logs)).not.toContain('private-looking-value');
  });

  it('aborts the attempt signal when pg-boss aborts the job', async () => {
    const ctx = aContext();
    const controller = new AbortController();

    await evidenceProcessHandler(ENVELOPE, ctx, anAttempt(0, controller.signal));
    const signal = ctx.inputs[0]?.signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    controller.abort();

    expect(signal.aborted).toBe(true);
  });

  it('gives the attempt a signal that is not aborted yet and is not the job signal itself', async () => {
    const ctx = aContext();
    const jobSignal = new AbortController().signal;

    await evidenceProcessHandler(ENVELOPE, ctx, anAttempt(0, jobSignal));

    expect(ctx.inputs[0]?.signal).not.toBe(jobSignal);
    expect(ctx.inputs[0]?.signal.aborted).toBe(false);
  });

  it('bounds one attempt at 120 seconds, under the queue expiry of 300', () => {
    expect(EVIDENCE_ATTEMPT_BUDGET_MS).toBe(120_000);
  });

  it('rethrows the processor failure so pg-boss retries the job', async () => {
    const retry = new Error('scanner unavailable');
    const ctx = aContext(retry);

    await expect(evidenceProcessHandler(ENVELOPE, ctx, anAttempt(0))).rejects.toBe(retry);
  });

  it('treats a call without attempt metadata as a single, last attempt', async () => {
    const ctx = aContext();

    await evidenceProcessHandler(ENVELOPE, ctx);

    expect(ctx.inputs[0]).toMatchObject({ attempt: 1, lastAttempt: true });
  });
});
