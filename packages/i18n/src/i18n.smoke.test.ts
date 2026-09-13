import { describe, expect, it } from 'vitest';
import { countParams, formatMonthYear, formatNumber, formatRelative } from './format';
import { MESSAGE_KEYS } from './keys';

/**
 * Cumulative smoke suite entry for T-006 (04-handoff-and-validation.md §3.1):
 * the package loads and the ported dictionary is not empty. Kept
 * intentionally shallow — the real coverage is format.test.ts and
 * messages.test.ts.
 *
 * Deliberately does NOT import ./routing: next-intl's createNavigation()
 * pulls in `next/navigation`, which only resolves inside a real Next.js app
 * (apps/web, from T-008 on) — packages/i18n has no direct `next` dependency
 * by design (01-conventions.md §2: "i18n -> (nothing runtime)"). Importing
 * it here fails at module-load time in a plain Node/vitest environment even
 * though `tsc` type-checks it fine. See docs/implementation/ISSUES.md.
 */
describe('i18n package smoke', () => {
  it('has a non-trivial ported dictionary', () => {
    expect(MESSAGE_KEYS.length).toBeGreaterThan(700);
  });

  it('formatters run for both locales without throwing', () => {
    expect(formatNumber(42, 'en')).toBe('42');
    expect(formatNumber(42, 'bn')).toBe('৪২');
    expect(formatMonthYear({ year: 2026, month: 3 }, 'bn')).toBe('মার্চ ২০২৬');
    expect(formatRelative(new Date(0), new Date(60000), 'en')).toBe('1 minute ago');
    expect(countParams(1, 2, 'bn')).toEqual({ count: '১', total: '২' });
  });
});
