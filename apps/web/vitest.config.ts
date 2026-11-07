import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultExclude, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
    // Playwright specs run under the root `pnpm e2e*` scripts, never under Vitest. The database-backed tests
    // run in the `web-int` project (T-101 § 10.7).
    exclude: [...defaultExclude, '**/*.int.test.ts', '**/*.int.smoke.test.ts', 'e2e/**'],
  },
});
