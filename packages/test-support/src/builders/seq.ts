// Deterministic id/counter source for every builder (task step 4: "never
// Math.random"). Each named sequence starts at 1 and increments per call so
// two builders in the same test file never collide on an id, and a test run
// is fully reproducible.
const counters = new Map<string, number>();

/** Returns the next integer in the named sequence, starting at 1. */
export function seq(name: string): number {
  const next = (counters.get(name) ?? 0) + 1;
  counters.set(name, next);
  return next;
}

/** Resets every sequence to 0. Tests may call this in `beforeEach` for stable snapshots. */
export function resetSeq(): void {
  counters.clear();
}

/** `<prefix>-<n>` using the named sequence — a short, readable, deterministic id. */
export function seqId(prefix: string): string {
  return `${prefix}-${seq(prefix)}`;
}
