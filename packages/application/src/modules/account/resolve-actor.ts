// Session and profile to Actor, on every request (T-101 WF11, BR4.1, BR4.3, BR4.8). Pure: `getActor`
// in `apps/web/src/server/auth.ts` gathers the inputs and acts on `revokeSession`. No persona is
// read (AD-3, T-104 F9) and no staff power is given (T-103 F2).
import { ANONYMOUS_ACTOR, type Actor } from '@rogikotha/contracts';

import { capabilitiesFor } from '../../authorization/capabilities';
import type { AccountProfileRecord } from '../../ports';
import type { ResolveActorInput, ResolveActorOutput } from './types';

/** Sessions are accepted for 30 days from creation, however often refreshed (BR4.1). */
export const MAX_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function anonymous(input: ResolveActorInput, extra: Partial<ResolveActorOutput> = {}) {
  return {
    actor: ANONYMOUS_ACTOR(input.locale, input.correlationId),
    revokeSession: false,
    profileMissing: false,
    ...extra,
  };
}

function accountActor(
  input: ResolveActorInput,
  profile: AccountProfileRecord,
  emailVerified: boolean,
): Actor {
  return {
    kind: 'account',
    accountId: profile.accountId,
    emailVerified,
    status: profile.status,
    capabilities: capabilitiesFor(null),
    locale: input.locale,
    correlationId: input.correlationId,
  };
}

export function resolveActor(input: ResolveActorInput): ResolveActorOutput {
  const { session, profile } = input;
  if (!session) return anonymous(input);
  if (session.createdAt.getTime() + input.maxSessionAgeMs <= input.now.getTime()) {
    return anonymous(input, { revokeSession: true });
  }
  if (!profile || profile.authUserId !== session.authUserId) {
    return anonymous(input, { profileMissing: true });
  }
  const base = { revokeSession: false, profileMissing: false };
  switch (profile.status) {
    case 'pending_verification':
      return { ...base, actor: accountActor(input, profile, false) };
    case 'active':
    case 'restricted':
      return { ...base, actor: accountActor(input, profile, true) };
    case 'suspended':
    case 'banned':
      return {
        ...base,
        actor: { ...ANONYMOUS_ACTOR(input.locale, input.correlationId), refusal: profile.status },
      };
    case 'deleted':
      return anonymous(input);
  }
}
