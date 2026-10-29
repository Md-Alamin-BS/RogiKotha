// @ts-check
// Import boundaries of `01-conventions.md` §2 with FD-040 and FD-093 (T-010). The element matrix
// is `docs/aidlc-migration/design-drafts/t-010-boundary-lint-and-ci/functional-spec.md` § 3.
import { builtinModules } from 'node:module';
import boundaries from 'eslint-plugin-boundaries';

// The fixture of `pnpm lint:boundaries` mirrors the repository layout under this prefix, so the
// same element list classifies both trees.
export const FIXTURE_ROOT = 'lint-fixtures/boundary-violation/';
const ROOT = `{,${FIXTURE_ROOT}}`;

const CODE = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
const SOURCE_FILES = [`${ROOT}packages/*/src/**/*.${CODE}`, `${ROOT}apps/*/src/**/*.${CODE}`];
const WORKER_FILES = [`${ROOT}apps/worker/src/**/*.${CODE}`];
const COMPONENT_FILES = [`${ROOT}apps/web/src/components/**/*.${CODE}`];
// Components import the shared helpers, so the helpers carry the component limits (FD-093 (6)).
const WEB_SHARED_FILES = [
  `${ROOT}apps/web/src/lib/**/*.${CODE}`,
  `${ROOT}apps/web/src/i18n/**/*.${CODE}`,
];

export const TEST_FILE_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/test-setup.ts',
  '**/global-setup.ts',
  '**/*-test-support.ts',
];

// Narrower patterns first (BR1.2): the first matching descriptor decides a file's element.
const element = (type, path) => ({ type, pattern: `${ROOT}${path}`, partialMatch: false });
const elements = [
  element('domain', 'packages/domain/src'),
  element('contracts', 'packages/contracts/src'),
  element('application', 'packages/application/src'),
  element('database', 'packages/database/src'),
  element('adapters', 'packages/adapters/src'),
  element('i18n', 'packages/i18n/src'),
  element('test-support-seed', 'packages/test-support/src/seed'),
  element('test-support', 'packages/test-support/src'),
  element('web-actions', 'apps/web/src/server/actions'),
  element('web-server', 'apps/web/src/server'),
  element('web-components', 'apps/web/src/components'),
  // ASSUMPTION(T-010): § 3 has no row for the app's shared helpers, which merged components and
  // server actions import (`@/lib/*`, and `@/i18n/routing`, the next-intl navigation wrapper).
  // They become one element both may import; the alternative was 21 inline suppressions.
  element('web-shared', 'apps/web/src/lib'),
  element('web-shared', 'apps/web/src/i18n'),
  element('web', 'apps/web/src'),
  element('worker', 'apps/worker/src'),
];

const PACKAGE_TYPES = [
  'domain',
  'contracts',
  'application',
  'database',
  'adapters',
  'i18n',
  'test-support-seed',
  'test-support',
];

const to = (...types) => ({ to: { element: { type: types } } });
const fromType = (type) => ({ element: { type } });
const external = (source) => ({ to: { module: { origin: 'external', source } } });

// Internal edges (BR2.1-BR2.6). Edges inside one element are not checked, so `server/container.ts`
// (E9) and the rest of `server/` (E11) share one row except for the adapters edge (BR2.3).
const matrix = [
  { from: fromType('application'), allow: to('domain', 'contracts') },
  { from: fromType('database'), allow: to('application', 'contracts') },
  { from: fromType('adapters'), allow: to('application', 'contracts') },
  {
    from: fromType('test-support-seed'),
    allow: to('application', 'contracts', 'domain', 'test-support', 'database'),
  },
  { from: fromType('test-support'), allow: to('application', 'contracts', 'domain') },
  { from: fromType('web-server'), allow: to('application', 'contracts', 'database', 'i18n') },
  {
    from: { element: { type: 'web-server' }, file: { categories: 'container' } },
    allow: to('adapters'),
  },
  {
    from: fromType('web-actions'),
    allow: to('application', 'contracts', 'i18n', 'web-server', 'web-shared'),
  },
  { from: fromType('web-components'), allow: to('contracts', 'i18n', 'web-actions', 'web-shared') },
  { from: fromType('web-shared'), allow: to('contracts', 'i18n') },
  {
    from: fromType('web'),
    allow: to(
      'application',
      'contracts',
      'i18n',
      'web-components',
      'web-actions',
      'web-server',
      'web-shared',
    ),
  },
  { from: fromType('worker'), allow: to('application', 'contracts', 'database', 'adapters') },
  // Package tests may use the shared fakes and builders; nothing in apps/* may (FD-040).
  {
    from: { element: { type: PACKAGE_TYPES }, file: { categories: 'test' } },
    allow: to('test-support'),
  },
];

// ASSUMPTION(T-010): test files need their runner and testing libraries as externals, which the
// matrix of § 3 does not list; this is the narrowest list the merged tests use.
const TEST_TOOLING = ['vitest', '@vitest/*', '@testing-library/*'];

// External and Node built-in edges (BR3.1-BR3.3): an element absent here may import none.
const externals = [
  {
    from: {
      element: {
        type: [
          'database',
          'adapters',
          'test-support-seed',
          'test-support',
          'web-actions',
          'web-server',
          'web-components',
          'web-shared',
          'web',
          'worker',
        ],
      },
    },
    allow: { to: { module: { origin: ['external', 'core'] } } },
  },
  { from: fromType('contracts'), allow: external(['zod', 'uuid']) },
  { from: fromType('i18n'), allow: external('next-intl') },
];

// Listed after the bans below, because the last matching policy wins (BR2.5).
const testAllowance = {
  from: { file: { categories: 'test' } },
  allow: [external(TEST_TOOLING), { to: { module: { origin: 'core' } } }],
};

// The AD-6 and FD-093 bans also cover `import()` and `require()`, which `no-restricted-imports`
// does not see (BR1.4); static imports are left to that rule so each edge is reported once.
const NOT_STATIC = { nodeKind: ['dynamic-import', 'require'] };
// That rule matches only the `@rogikotha/application` specifiers (`/worker` alone passes), so a
// static value import that reaches the element by any other path, a relative one for example,
// is refused here. `import { type X }` counts as a value import: it still loads the module.
const STATIC_VALUE_OUTSIDE_APPLICATION_SPECIFIERS = {
  nodeKind: ['import', 'export'],
  kind: 'value',
  source: '!@rogikotha/application{,/**}',
};
const WORKER_BANNED = ['better-auth', 'drizzle-orm', 'pg'];
const COMPONENT_BANNED = [
  'pg',
  'pg-boss',
  'drizzle-orm',
  'better-auth',
  'sharp',
  'pdfjs-dist',
  'dotenv',
  '@node-rs/argon2',
];
const boundaryBans = [
  {
    from: fromType('worker'),
    disallow: [
      { to: { module: { source: WORKER_BANNED } }, dependency: NOT_STATIC },
      {
        to: { element: { type: 'application' } },
        dependency: { ...NOT_STATIC, source: '!@rogikotha/application/worker' },
      },
      {
        to: { element: { type: 'application' } },
        dependency: STATIC_VALUE_OUTSIDE_APPLICATION_SPECIFIERS,
      },
    ],
    message: 'The worker may not load this module (AD-6, FD-093).',
  },
  {
    from: { element: { type: ['web-components', 'web-shared'] } },
    disallow: [
      { to: { module: { source: COMPONENT_BANNED } }, dependency: NOT_STATIC },
      { to: { module: { origin: 'core' } }, dependency: NOT_STATIC },
    ],
    message:
      'Components and the shared helpers they import may not load server-only modules (01-conventions.md §2).',
  },
];

// A workspace or `@/` import that did not resolve to a source file would otherwise count as an
// external package and pass every element rule (BR1.3).
const unresolvedInternal = {
  disallow: [
    { to: { module: { origin: 'external', source: '@rogikotha/*' } } },
    { dependency: { source: '@/**' }, to: { module: { origin: 'external' } } },
  ],
  message: 'This internal import did not resolve to a source file.',
};

const nodeBuiltins = builtinModules.filter((name) => !name.startsWith('_'));

/** One `no-restricted-imports` configuration per file set (BR3.7). */
const workerRestrictions = {
  paths: [
    {
      name: '@rogikotha/application',
      allowTypeImports: true,
      message:
        'The worker takes application code only from @rogikotha/application/worker (FD-093).',
    },
  ],
  patterns: [
    {
      group: ['better-auth', 'better-auth/*'],
      message: 'The worker never holds an application session (AD-6).',
    },
    {
      group: ['drizzle-orm', 'drizzle-orm/*', 'pg', 'pg/*'],
      message: 'Table access goes through packages/database repositories (FD-093, ISS-205).',
    },
    {
      group: ['@rogikotha/application/*', '!@rogikotha/application/worker'],
      message:
        'The worker takes application code only from @rogikotha/application/worker (FD-093).',
    },
    {
      group: [
        '**/modules/identity/**',
        '**/modules/account/**',
        '**/modules/data-requests/commands/**',
      ],
      message: 'Identity, account and deletion commands stay out of the worker (AD-6).',
    },
  ],
};

const NO_NODE_MESSAGE =
  'Components and the shared helpers they import may not import Node built-ins (01-conventions.md §2).';
const componentRestrictions = {
  paths: nodeBuiltins.map((name) => ({ name, message: NO_NODE_MESSAGE })),
  patterns: [
    { group: ['node:*'], message: NO_NODE_MESSAGE },
    {
      group: COMPONENT_BANNED.flatMap((name) => [name, `${name}/*`]),
      message:
        'Components and the shared helpers they import may not import server-only libraries (01-conventions.md §2).',
    },
  ],
};

/** @type {import('eslint').Linter.Config[]} */
export const boundaryConfigs = [
  {
    files: SOURCE_FILES,
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      'boundaries/elements': elements,
      'boundaries/files': [
        { pattern: TEST_FILE_PATTERNS, category: 'test' },
        // Element patterns name folders, so the composition root is a file category (E9).
        { pattern: `${ROOT}apps/web/src/server/container.ts`, category: 'container' },
      ],
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: [
            'packages/*/tsconfig.json',
            'apps/*/tsconfig.json',
            'lint-fixtures/tsconfig.json',
          ],
        },
      },
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': ['error', { require: 'element' }],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [...matrix, ...externals, ...boundaryBans, testAllowance, unresolvedInternal],
        },
      ],
    },
  },
  {
    files: WORKER_FILES,
    rules: { '@typescript-eslint/no-restricted-imports': ['error', workerRestrictions] },
  },
  {
    files: [...COMPONENT_FILES, ...WEB_SHARED_FILES],
    ignores: TEST_FILE_PATTERNS,
    rules: { '@typescript-eslint/no-restricted-imports': ['error', componentRestrictions] },
  },
];
