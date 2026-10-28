import { defineConfig } from 'vitest/config';

// Tests of the root scripts and tools (T-010). They lint and run whole files, so they get time.
export default defineConfig({
  test: {
    name: 'tooling',
    environment: 'node',
    include: ['**/*.test.mjs'],
    testTimeout: 120_000,
  },
});
