import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'worker',
    environment: 'node',
    passWithNoTests: true,
    // Integration files need compose and run in the `worker-int` project (vitest.workspace.ts).
    exclude: [...defaultExclude, '**/*.int.test.ts', '**/*.int.smoke.test.ts'],
  },
});
