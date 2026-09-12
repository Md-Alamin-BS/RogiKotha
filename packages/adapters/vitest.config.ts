import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'adapters',
    environment: 'node',
    passWithNoTests: true,
    exclude: [...defaultExclude, '**/*.int.test.ts'],
  },
});
