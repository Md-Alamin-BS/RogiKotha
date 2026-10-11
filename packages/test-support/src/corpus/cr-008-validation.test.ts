// Added by the CR-008 validator (docs/validation/CR-008.md). Guards, inside
// the default `pnpm test` sweep, the two corpus-level facts CR-008 fixed that
// otherwise only the standalone, opt-in `seed.int.test.ts` or a manual query
// would notice regressing: the port dropping the prototype's `reports` count
// again (ISS-174), and the five `shirin_88` notifications no longer covering
// the `notification_kind` enum the seed maps them onto (ISS-173).
import { NOTIFICATION_KINDS } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { MODERATION_CASES, USER_NOTIFICATIONS } from './index.js';

describe('CR-008 corpus invariants', () => {
  it('carries the prototype report count for MOD-2033 rather than the length of its reason list', () => {
    const mod2033 = MODERATION_CASES.find((c) => c.seedRef === 'MOD-2033');
    expect(mod2033?.reportCount).toBe(6);
    expect(mod2033?.reportReasons.length).toBe(3);
  });

  it('never gives a case fewer reports than it has authored reasons', () => {
    for (const c of MODERATION_CASES) {
      expect(c.reportCount, c.seedRef).toBeGreaterThanOrEqual(c.reportReasons.length);
    }
  });

  it('keeps the other four cases at the report counts T-007 seeded', () => {
    const counts = Object.fromEntries(MODERATION_CASES.map((c) => [c.seedRef, c.reportCount]));
    expect(counts).toMatchObject({ 'MOD-2011': 0, 'MOD-2029': 1, 'MOD-2038': 1, 'MOD-2041': 2 });
  });

  it('has exactly one shirin_88 notification per notification kind', () => {
    expect(USER_NOTIFICATIONS).toHaveLength(5);
    expect(new Set(USER_NOTIFICATIONS.map((n) => n.accountUsername))).toEqual(new Set(['shirin_88']));
    expect([...USER_NOTIFICATIONS.map((n) => n.kind)].sort()).toEqual([...NOTIFICATION_KINDS].sort());
  });

  it('uses relative times the notification seed step can parse, so its insert never throws', () => {
    for (const n of USER_NOTIFICATIONS) {
      expect(n.when.en, n.seedRef).toMatch(/^\d+\s+(day|days|week|weeks)\s+ago$/);
    }
  });
});
