// `getActor()` (T-101 WF11, BR4.3, BR4.4, BR4.8): gathers the session, the profile, the locale and
// the correlation id, and hands them to the pure `resolveActor`. The status is read on every
// request, so a suspended account loses its session on the next one.
//
// Never call these inside a `'use cache'` scope: a cached session read would serve one person's
// session to another (BR4.4). `cache()` here only shares the answer within one request.
import {
  MAX_SESSION_AGE_MS,
  resolveActor,
  type AuthSessionInfo,
  type CommandRequest,
} from '@rogikotha/application';
import { LOCALES, newId, type Actor, type Locale } from '@rogikotha/contracts';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { cache } from 'react';

import { clientAddressFrom } from './client-address';
import { getContainer } from './container';

// The routing default of `@rogikotha/i18n`, for a request with no locale segment (an API route).
const FALLBACK_LOCALE: Locale = 'en';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RequestContext {
  actor: Actor;
  request: CommandRequest;
  /** Null when the request has no live session; never the token. */
  session: AuthSessionInfo | null;
}

async function requestLocale(): Promise<Locale> {
  try {
    const locale = await getLocale();
    return (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}

/** A well-formed incoming `x-correlation-id`, else a fresh one. */
export function correlationIdFrom(value: string | null): string {
  return value !== null && UUID_RE.test(value) ? value.toLowerCase() : newId();
}

export const getRequestContext = cache(async (): Promise<RequestContext> => {
  const { env, ports } = getContainer();
  const requestHeaders = await headers();
  const locale = await requestLocale();
  const correlationId = correlationIdFrom(requestHeaders.get('x-correlation-id'));

  const found = await ports.authGateway.getSession(requestHeaders);
  const profile = found
    ? await ports.unitOfWork.read((tx) =>
        ports.accounts.findProfileByAuthUserId(tx, found.authUserId),
      )
    : null;
  const resolved = resolveActor({
    session: found,
    profile,
    locale,
    correlationId,
    now: ports.clock.now(),
    maxSessionAgeMs: MAX_SESSION_AGE_MS,
  });
  if (resolved.revokeSession && found) await ports.authGateway.revokeSession(found.sessionId);
  if (resolved.profileMissing) ports.logger.warn('auth.profile_missing', { correlationId });

  const session = resolved.actor.kind === 'account' ? found : null;
  return {
    actor: resolved.actor,
    session,
    request: {
      headers: requestHeaders,
      clientAddress: clientAddressFrom(requestHeaders, env.appMode),
      sessionId: session?.sessionId ?? null,
    },
  };
});

/** The Actor of the current request: anonymous without a valid session (BR7.10). */
export async function getActor(): Promise<Actor> {
  return (await getRequestContext()).actor;
}
