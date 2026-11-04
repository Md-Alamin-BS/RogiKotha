// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { currentScope, runInScope } from './library-scope';

describe('the library-call scope (BR7.9)', () => {
  it('is visible to code awaited inside the call, and gone after it', async () => {
    const seen = await runInScope({ purpose: 'register' }, async () => {
      await Promise.resolve();
      return currentScope()?.purpose;
    });

    expect(seen).toBe('register');
    expect(currentScope()).toBeUndefined();
  });

  it('allows a session only when the caller says so', async () => {
    const plain = await runInScope({ purpose: 'signIn' }, () =>
      Promise.resolve(currentScope()?.sessionAllowed),
    );
    const decided = await runInScope({ purpose: 'signIn', sessionAllowed: true }, () =>
      Promise.resolve(currentScope()?.sessionAllowed),
    );

    expect(plain).toBe(false);
    expect(decided).toBe(true);
  });

  it('keeps two concurrent calls apart, so one call never reads the other token', async () => {
    const first = runInScope({ purpose: 'issueReset' }, async (scope) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return currentScope() === scope ? scope.token : 'leaked';
    });
    const second = runInScope({ purpose: 'issueReset' }, (scope) => {
      scope.token = 'second-token';
      return Promise.resolve(scope.token);
    });

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, 'second-token']);
  });
});
