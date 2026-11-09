// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import { TEST_FILE_PATTERNS, boundaryConfigs } from './eslint.boundaries.mjs';

const APPLICATION_SOURCE = [
  'apps/*/src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  'packages/*/src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
];

// T-502 BR6.7: the only application files that may write to the console.
const NO_CONSOLE_EXCEPTIONS = [
  // The web logger's own writer.
  'apps/web/src/server/logger.ts',
  // The worker logger's own writer.
  'apps/worker/src/logger.ts',
  // The `pnpm db:migrate` tool runs in a developer terminal, never in the web or worker process.
  'packages/database/src/migrate.ts',
  // The `pnpm db:reset` tool runs in a developer terminal, never in the web or worker process.
  'packages/database/src/reset.ts',
  // ASSUMPTION(U41): the dev-only `pnpm db:seed` tool, like migrate and reset; it prints counts.
  'packages/test-support/src/seed/seed.ts',
];

export default tseslint.config(
  {
    // Not repo source: the design prototype, the contrast tool, local data, docs, the AI-DLC
    // harness (.claude) and the design-tool config (.impeccable).
    ignores: [
      'node_modules',
      '**/dist',
      '**/.next',
      'ui-design-prototype/**',
      'tools/**',
      '.data/**',
      'docs/**',
      '.claude/**',
      '.impeccable/**',
      // T-010: planted boundary violations, linted only by `pnpm lint:boundaries`.
      'lint-fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // T-502 BR6.7: no console method in application source; the block below allows `warn` and
      // `error` everywhere else. A severity without options would inherit an earlier `allow`.
      'no-console': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    ignores: APPLICATION_SOURCE,
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  {
    files: [...TEST_FILE_PATTERNS, ...NO_CONSOLE_EXCEPTIONS],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  {
    // Plain JS config files and root-level TS config files are not covered by
    // any package tsconfig's "include", so type-aware linting cannot resolve
    // a project for them. ASSUMPTION(T-001): exclude them from type-aware
    // rules rather than inventing a root tsconfig just to cover config files
    // (see ISS-002).
    files: ['**/*.mjs', '**/*.cjs', '**/*.config.ts', 'vitest.workspace.ts', 'lint-fixtures/**'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // T-010: the root scripts run under Node.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  ...boundaryConfigs,
  eslintConfigPrettier,
);
