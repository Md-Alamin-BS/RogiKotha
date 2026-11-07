import type { ConditionCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';

const CHIP_LIMIT = 5;

/** BR1.2: up to five topics with accounts, most accounts first, ties by name in the active language. */
export function pickChips(conditions: ConditionCardVM[], locale: Locale): ConditionCardVM[] {
  const collator = new Intl.Collator(locale);
  return conditions
    .filter((c) => c.accountsTotal > 0)
    .sort((a, b) => b.accountsTotal - a.accountsTotal || collator.compare(a.name, b.name))
    .slice(0, CHIP_LIMIT);
}

/** BR1.3: every topic with at least one account, in the query's order (by name). */
export function browseConditions(conditions: ConditionCardVM[]): ConditionCardVM[] {
  return conditions.filter((c) => c.accountsTotal > 0);
}
