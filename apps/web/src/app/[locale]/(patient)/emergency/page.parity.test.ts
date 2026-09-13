import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { EMERGENCY_DEFAULTS } from './page';

// This import of `@rogikotha/contracts` only has to resolve under Vitest
// (Vite), which — unlike Next's Turbopack build — handles the package's
// `.js`-suffixed relative imports fine (see the ASSUMPTION comment in
// page.tsx and ISSUES.md). That gap is exactly why `page.tsx` cannot import
// `DEFAULT_CONFIG_VALUES` directly and instead hand-types a local copy;
// this test is the drift guard for that copy until the build gap is fixed
// and the page can import the real value.
describe('EmergencyPage default emergency config', () => {
  it('matches packages/contracts/src/config-values.ts DEFAULT_CONFIG_VALUES.emergency exactly', () => {
    expect(EMERGENCY_DEFAULTS).toEqual(DEFAULT_CONFIG_VALUES.emergency);
  });
});
