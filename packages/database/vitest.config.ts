import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    passWithNoTests: true,
    // Integration tests (*.int.test.ts) are not excluded here: this is the
    // only project that runs them, via `pnpm test:int`.
  },
});
