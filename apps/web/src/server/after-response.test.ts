// @vitest-environment node
import type { Logger } from '@rogikotha/application';
import { describe, expect, it, vi } from 'vitest';

import { createAfterResponse } from './after-response';

vi.mock('next/server', () => ({ after: vi.fn() }));

function buildLogger() {
  return {
    info: vi.fn<Logger['info']>(),
    warn: vi.fn<Logger['warn']>(),
    error: vi.fn<Logger['error']>(),
  } satisfies Logger;
}

describe('work after the response (WF5)', () => {
  it('hands the task to the scheduler instead of running it in the response', async () => {
    const scheduled: (() => Promise<void>)[] = [];
    const task = vi.fn(() => Promise.resolve());
    const afterResponse = createAfterResponse(buildLogger(), (work) => scheduled.push(work));

    afterResponse.run(task);
    expect(task).not.toHaveBeenCalled();
    await scheduled[0]!();

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('logs a failed task by name only and never throws to the caller', async () => {
    const logger = buildLogger();
    const scheduled: (() => Promise<void>)[] = [];
    const afterResponse = createAfterResponse(logger, (work) => scheduled.push(work));

    afterResponse.run(() => Promise.reject(new Error('shirin.demo@example.test')));
    await scheduled[0]!();

    expect(logger.error).toHaveBeenCalledWith('after_response.failed');
  });

  it('runs the task at once outside a request, where the scheduler throws', async () => {
    const task = vi.fn(() => Promise.resolve());
    const afterResponse = createAfterResponse(buildLogger(), () => {
      throw new Error('outside a request scope');
    });

    afterResponse.run(task);
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(1));
  });
});
