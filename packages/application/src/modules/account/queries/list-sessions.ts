// `account.listSessions` (T-101 WF10, BR4.1, BR4.7, FD-057): live sessions inside the 30-day cap,
// newest first, with browser and OS families; no IP, no token, no history.
import { err, ListSessionsInput, ok, type Result, type SessionVM } from '@rogikotha/contracts';

import { defineQuery, type CommandContext } from '../../../command';
import { MAX_SESSION_AGE_MS } from '../resolve-actor';
import type { ListSessionsOutput } from '../types';
import { browserFamily, osFamily } from '../user-agent';

async function handle(ctx: CommandContext<ListSessionsInput>): Promise<Result<ListSessionsOutput>> {
  const { ports, request, actor, tx } = ctx;
  const profile = await ports.accounts.findProfileById(tx, actor.accountId ?? '');
  if (!profile) return err('forbidden', { correlationId: actor.correlationId });
  const now = ports.clock.now().getTime();
  const sessions = await ports.authGateway.listSessions(profile.authUserId);
  const live: SessionVM[] = sessions
    .filter((s) => s.expiresAt.getTime() > now && s.createdAt.getTime() + MAX_SESSION_AGE_MS > now)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((s) => ({
      id: s.sessionId,
      current: s.sessionId === request.sessionId,
      browser: browserFamily(s.userAgent),
      os: osFamily(s.userAgent),
      firstSeen: s.createdAt.toISOString(),
      lastSeen: s.updatedAt.toISOString(),
    }));
  return ok(live);
}

export const listSessionsQuery = defineQuery<ListSessionsInput, ListSessionsOutput>({
  name: 'account.listSessions',
  input: ListSessionsInput,
  requires: { authenticated: true },
  handle,
});
