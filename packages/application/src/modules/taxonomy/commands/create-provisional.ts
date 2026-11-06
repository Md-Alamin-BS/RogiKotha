// `taxonomy.createProvisional` (WF10, C6): a verified, unrestricted account turns a wording into a
// provisional term (BR5.1), at most 30 times an hour per process (BR5.4). Every call counts,
// idempotent ones included. No release-1 screen calls it (Question 14).
import { CreateProvisionalInput, err, ok } from '@rogikotha/contracts';

import { defineCommand } from '../../../command';
import type { RateLimitKey } from '../../../ports';
import {
  CREATE_PROVISIONAL_LIMIT,
  CREATE_PROVISIONAL_WINDOW_SEC,
  type TaxonomyDeps,
} from '../deps';
import { ensureProvisionalTerm } from '../provisional-term';

export function createProvisionalRateLimitKey(accountId: string): RateLimitKey {
  return `taxonomy.createProvisional:account:${accountId}`;
}

export function createProvisionalCommand(deps: TaxonomyDeps) {
  return defineCommand<CreateProvisionalInput, { termId: string }>({
    name: 'taxonomy.createProvisional',
    input: CreateProvisionalInput,
    requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
    async handle({ input, tx, actor, ports }) {
      // `requires.authenticated` guarantees an account actor with an id.
      const accountId = actor.accountId ?? '';
      const decision = await ports.rateLimiter.hit(
        createProvisionalRateLimitKey(accountId),
        CREATE_PROVISIONAL_LIMIT,
        CREATE_PROVISIONAL_WINDOW_SEC,
      );
      if (!decision.allowed) {
        return err('rate_limited', {
          correlationId: actor.correlationId,
          ...(decision.retryAfter !== undefined ? { retryAfterSec: decision.retryAfter } : {}),
        });
      }
      const result = await ensureProvisionalTerm(
        deps,
        tx,
        input,
        `account:${accountId}`,
        actor.correlationId,
      );
      return result.ok ? ok({ termId: result.data.termId }) : result;
    },
  });
}
