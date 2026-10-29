import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// next/font/local only works under Next's build transform: outside it,
// `localFont()` throws, and every test that renders the [locale] layout loads
// app/fonts/bn-heading.ts (T-011 design F4, BR9.9).
vi.mock('next/font/local', () => ({
  default: () => ({
    className: 'font-bn-heading',
    variable: 'font-bn-heading-var',
    style: { fontFamily: 'Hind Siliguri' },
  }),
}));

// Not using vitest's `globals: true` (kept consistent with every other
// package's vitest.config.ts, which import describe/it/expect explicitly),
// so @testing-library/react's own auto-cleanup detection (which looks for
// a global `afterEach`) never fires — register it explicitly instead.
afterEach(() => {
  cleanup();
});
