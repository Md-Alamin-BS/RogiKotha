import { describe, expect, it } from 'vitest';

// Cumulative smoke suite (04-handoff-and-validation.md §3.1). T-001 has no
// behaviour to assert yet, so this proves the workspace itself is wired:
// the package resolves and loads through its declared `exports` entry, and
// `import.meta` resolution — which the workspace's ESM + bundler module
// settings depend on — works for a file living inside a workspace package.
describe('workspace scaffold', () => {
  it('loads the contracts package entry module', async () => {
    const contracts = await import('./index.js');

    expect(contracts).toBeDefined();
  });

  it('resolves import.meta.url for a file inside a workspace package', () => {
    // Cast locally rather than adding a global `types` dependency just for
    // this assertion: the base tsconfig targets ESNext without `@types/node`,
    // whose declarations are what normally add `url` to `ImportMeta`.
    const meta = import.meta as ImportMeta & { url: string };

    expect(meta.url).toContain('packages/contracts/src/workspace.smoke.test.ts');
  });
});
