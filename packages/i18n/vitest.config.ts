import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'i18n',
    environment: 'node',
    passWithNoTests: true,
    exclude: [...defaultExclude, '**/*.int.test.ts'],
  },
});
