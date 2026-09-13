import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';

// CR-005 fixed `packages/contracts`'s `.js`-suffixed relative imports
// (ISS-133, which used to break this import under Next's Turbopack build),
// so `page.tsx` now imports `DEFAULT_CONFIG_VALUES` directly from the main
// `@rogikotha/contracts` barrel instead of a hand-typed local copy
// (ISS-134, both closed). This test's job changes from "does the local
// copy match the real default" (a drift guard that no longer applies —
// there is no longer a second copy to drift) to "does the real default
// still hold the exact values the demo storyboard and
// `components/patient/Emergency.test.tsx`'s hardcoded fixture expect" — a
// silent change to the shared default would otherwise change what
// `/emergency` renders live with nothing here to catch it.
describe('EmergencyPage config source', () => {
  it('DEFAULT_CONFIG_VALUES.emergency has the exact values the emergency page renders', () => {
    expect(DEFAULT_CONFIG_VALUES.emergency).toEqual({
      ambulance: '999',
      healthLine: '16263',
      crisisLine: '09612-119911',
      lastVerified: '2026-08-21',
    });
  });
});
