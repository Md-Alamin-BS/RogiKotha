import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Not using vitest's `globals: true` (kept consistent with every other
// package's vitest.config.ts, which import describe/it/expect explicitly),
// so @testing-library/react's own auto-cleanup detection (which looks for
// a global `afterEach`) never fires — register it explicitly instead.
afterEach(() => {
  cleanup();
});
