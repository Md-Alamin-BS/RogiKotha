// How eligible accounts spread over one enum (U46 BR3.1, BR2.3, BR2.4): a port of the prototype's
// distribution(), with exact counts and their denominator and never a percentage (FD-106).
// Plain values only (BR6.6). U46 owns `isLimitedData` and `distribution`; U47 adds beside them.

export interface Distribution<K extends string> {
  keys: readonly K[];
  /** Every key, zero included. */
  counts: Record<K, number>;
  /** Values that are one of `keys`: the denominator. */
  total: number;
  /** Accounts that gave no value at all. */
  notProvided: number;
  empty: boolean;
  limitedData: boolean;
}

/** Limited data: some accounts, but fewer than the configured threshold. */
export function isLimitedData(total: number, threshold: number): boolean {
  return total > 0 && total < threshold;
}

/**
 * Counts each value that is one of `keys` once, counts an absent value (null or undefined) as not
 * provided, and ignores any other value.
 */
export function distribution<K extends string>(
  values: readonly (string | null | undefined)[],
  keys: readonly K[],
  threshold: number,
): Distribution<K> {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  const known = new Set<string>(keys);
  let total = 0;
  let notProvided = 0;
  for (const value of values) {
    if (value === null || value === undefined) {
      notProvided += 1;
    } else if (known.has(value)) {
      counts[value as K] += 1;
      total += 1;
    }
  }
  return {
    keys,
    counts,
    total,
    notProvided,
    empty: total === 0,
    limitedData: isLimitedData(total, threshold),
  };
}

/** The same summary from counts already grouped by the database. */
export function distributionFromCounts<K extends string>(
  grouped: Readonly<Partial<Record<string, number>>>,
  notProvided: number,
  keys: readonly K[],
  threshold: number,
): Distribution<K> {
  const counts = Object.fromEntries(keys.map((k) => [k, grouped[k] ?? 0])) as Record<K, number>;
  const total = keys.reduce((sum, k) => sum + counts[k], 0);
  return {
    keys,
    counts,
    total,
    notProvided,
    empty: total === 0,
    limitedData: isLimitedData(total, threshold),
  };
}
