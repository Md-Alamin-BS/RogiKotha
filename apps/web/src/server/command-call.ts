// How a server action runs an application command (T-101 § 6.3): the request's Actor and context,
// the container's ports, and the session cookie the result asks for. Kept out of the
// `'use server'` files, which may export only async actions.
import type { Command, SessionCookieEffect } from '@rogikotha/application';
import type { Result } from '@rogikotha/contracts';

import { getRequestContext } from './auth';
import { applySetCookies, clearSessionCookies } from './better-auth/session-cookies';
import { getContainer } from './container';

export async function runCommand<I, O>(command: Command<I, O>, raw: unknown): Promise<Result<O>> {
  const { actor, request } = await getRequestContext();
  return command.execute(raw, { actor, request, ports: getContainer().ports });
}

/** Writes or clears the session cookie; the `Set-Cookie` values never reach the browser's result. */
export async function applySessionEffect(effect: SessionCookieEffect): Promise<void> {
  if (effect.kind === 'set') await applySetCookies(effect.setCookies);
  else if (effect.kind === 'clear') await clearSessionCookies(getContainer().auth);
}

/**
 * Runs a command whose output carries a session effect, applies it on `ok` only, and returns the
 * output without it.
 */
export async function runSessionCommand<I, O extends { session: SessionCookieEffect }>(
  command: Command<I, O>,
  raw: unknown,
): Promise<Result<Omit<O, 'session'>>> {
  const result = await runCommand(command, raw);
  if (!result.ok) return result;
  const { session, ...rest } = result.data;
  await applySessionEffect(session);
  return { ok: true, data: rest };
}
