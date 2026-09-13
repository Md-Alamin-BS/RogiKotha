// ASSUMPTION(T-001): Vitest 4 removed the standalone `defineWorkspace` /
// auto-discovered `vitest.workspace.ts` mechanism the task file specified
// (vitest/config no longer exports `defineWorkspace`; a root config's
// `test.projects` array is the replacement — see ISS-004). This file keeps
// the name and the two globs the task asked for, but is a normal Vitest
// config referenced explicitly via `--config vitest.workspace.ts` from the
// root scripts, since Vitest no longer auto-loads a file with this name.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: ['packages/*/vitest.config.ts', 'apps/*/vitest.config.ts'],
  },
});
