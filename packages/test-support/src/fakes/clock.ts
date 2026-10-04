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
}
