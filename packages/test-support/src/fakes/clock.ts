// `Clock` port fake (03-routes-and-contracts.md §3: `now(): Date`). Starts
// at a fixed instant so tests are deterministic; `set`/`advance` let a test
// move time the way the demo clock does.
export class FakeClock {
  private current: Date;

  constructor(start: Date = new Date('2026-09-01T00:00:00.000Z')) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  /** Jumps to an exact instant. */
  set(d: Date): void {
    this.current = d;
  }

  /** Moves time forward (or backward with a negative value) by N days. */
  advance(days: number): void {
    this.current = new Date(this.current.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /** Moves time forward by N milliseconds (sign-in delays and windows are seconds and minutes). */
  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** `Sleeper` port fake: records each wait and moves the clock instead of waiting. */
export class ClockSleeper {
  readonly waits: number[] = [];

  constructor(private readonly clock: FakeClock) {}

  sleep(ms: number): Promise<void> {
    this.waits.push(ms);
    if (ms > 0) this.clock.advanceMs(ms);
    return Promise.resolve();
  }
}

/**
 * `AfterResponse` port fake: records each task and runs it when the test calls `settle()`, as
 * Next's `after()` runs it once the response is sent, so it never shares the caller's transaction.
 */
export class ImmediateAfterResponse {
  scheduled = 0;
  private readonly pending: (() => Promise<void>)[] = [];

  run(task: () => Promise<void>): void {
    this.scheduled += 1;
    this.pending.push(task);
  }

  async settle(): Promise<void> {
    while (this.pending.length > 0) {
      const task = this.pending.shift();
      if (task) await task();
    }
  }
}
