// Next's `after()` in `apps/web/src/server/after-response.ts`; the severe-activity notice (WF5)
// runs here so it never changes the sign-in response or its timing.

export interface AfterResponse {
  /** Schedules `task`; a failure inside it is the task's to log, never the caller's. */
  run(task: () => Promise<void>): void;
}
