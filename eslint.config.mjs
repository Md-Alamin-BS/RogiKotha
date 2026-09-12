// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // ASSUMPTION(T-001): the task's ignore list (node_modules, dist, .next,
    // ui-design-prototype, tools, _bmad, .data, docs) did not anticipate the
    // agent-tooling directories already present in this checkout
    // (.agents, .claude, .github, .impeccable) — they hold third-party skill
    // scripts, not repo source, so they are ignored too (see ISS-003).
    ignores: [
      'node_modules',
      '**/dist',
      '**/.next',
      'ui-design-prototype/**',
      'tools/**',
      '_bmad/**',
      '.data/**',
      'docs/**',
      '.agents/**',
      '.claude/**',
      '.github/**',
      '.impeccable/**',
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
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Plain JS config files and root-level TS config files are not covered by
    // any package tsconfig's "include", so type-aware linting cannot resolve
    // a project for them. ASSUMPTION(T-001): exclude them from type-aware
    // rules rather than inventing a root tsconfig just to cover config files
    // (see ISS-002).
    files: ['**/*.mjs', '**/*.cjs', '**/*.config.ts', 'vitest.workspace.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // T-010 adds boundaries here
  eslintConfigPrettier,
);
