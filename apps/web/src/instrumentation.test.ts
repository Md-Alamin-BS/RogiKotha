// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { register } from './instrumentation';
import { readWebEnv } from './server/env';

vi.mock('./server/env', () => ({ readWebEnv: vi.fn() }));

const savedRuntime = process.env.NEXT_RUNTIME;

afterEach(() => {
  process.env.NEXT_RUNTIME = savedRuntime;
  vi.clearAllMocks();
});

describe('server start (BR7.2)', () => {
  it('checks the settings when a Node server starts', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    await register();
    expect(readWebEnv).toHaveBeenCalledTimes(1);
  });

  it('refuses to start when the settings are not usable', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    vi.mocked(readWebEnv).mockImplementationOnce(() => {
      throw new Error('Server settings are not usable: TERMS_VERSION is not set');
    });
    await expect(register()).rejects.toThrow('TERMS_VERSION');
  });

  it('reads nothing in the edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    await register();
    expect(readWebEnv).not.toHaveBeenCalled();
  });
});
