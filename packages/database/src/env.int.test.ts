// CR-011 T16 (BR5.1, ISS-203): loading the env module prints nothing. dotenv's
// banner goes through `console.log`, so both it and the raw stdout stream are
// watched. The setup file has already loaded `./env`, so the module registry
// is reset first to load it again.
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('packages/database env loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T16: loading packages/database/src/env.ts writes nothing to stdout', async () => {
    const consoleLog = vi.spyOn(console, 'log');
    const stdoutWrite = vi.spyOn(process.stdout, 'write');
    vi.resetModules();

    await import('./env');

    expect(consoleLog).not.toHaveBeenCalled();
    expect(stdoutWrite).not.toHaveBeenCalled();
  });
});
