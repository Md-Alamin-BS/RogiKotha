// The `AfterResponse` port over Next's `after()` (T-101 Q9, WF5): the severe-activity notice runs
// once the sign-in response is sent, so it never changes that response or its timing.
import type { AfterResponse, Logger } from '@rogikotha/application';
import { after } from 'next/server';

type Schedule = (task: () => Promise<void>) => void;

export function createAfterResponse(logger: Logger, schedule: Schedule = after): AfterResponse {
  const guarded = (task: () => Promise<void>) => async () => {
    try {
      await task();
    } catch {
      logger.error('after_response.failed');
    }
  };
  return {
    run(task) {
      try {
        schedule(guarded(task));
      } catch {
        // Outside a request (a script, a test of the container) `after()` throws: run it now.
        void guarded(task)();
      }
    },
  };
}
