import { describe, expect, it } from 'vitest';

import { evidenceSweepHandler } from './evidence-sweep.js';
import type { EvidenceSweepContext } from './evidence-sweep.js';

function aContext(ended: number, failWith?: Error) {
  const logs: { event: string; fields: Record<string, unknown> | undefined }[] = [];
  let runs = 0;
  const log = (event: string, fields?: Record<string, unknown>): void => {
    logs.push({ event, fields });
  };
  const ctx: EvidenceSweepContext = {
    logger: { info: log, warn: log, error: log },
    sweepEvidence: () => {
      runs += 1;
      return failWith === undefined ? Promise.resolve({ ended }) : Promise.reject(failWith);
    },
  };
  return { ctx, logs, runs: () => runs };
}

describe('evidenceSweepHandler', () => {
  it('runs the sweep once and logs how many items it ended', async () => {
    const { ctx, logs, runs } = aContext(2);

    await evidenceSweepHandler({}, ctx);

    expect(runs()).toBe(1);
    expect(logs).toEqual([{ event: 'evidence.sweep_done', fields: { ended: 2 } }]);
  });

  it('stays quiet when nothing was stuck', async () => {
    const { ctx, logs } = aContext(0);

    await evidenceSweepHandler(undefined, ctx);

    expect(logs).toEqual([]);
  });

  it('lets a failing sweep reject so the next cron run tries again', async () => {
    const { ctx } = aContext(0, new Error('database offline'));

    await expect(evidenceSweepHandler({}, ctx)).rejects.toThrow('database offline');
  });
});
