import { describe, expect, it, vi } from 'vitest';

// The i18n package's next-intl build does not resolve under Vitest (see routing.test.ts), so
// the package request config is a stand-in and the test checks the wiring.
const packageConfig = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('@rogikotha/i18n/request', () => ({ default: packageConfig }));

import appConfig from './request';

describe('app request config', () => {
  it('is the request config the i18n package owns', () => {
    expect(appConfig).toBe(packageConfig);
  });
});
