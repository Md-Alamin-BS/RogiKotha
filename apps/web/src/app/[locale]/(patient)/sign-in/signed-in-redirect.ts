import type { Route } from 'next';
import { redirect } from 'next/navigation';
import type { Actor } from '@rogikotha/contracts';
import { safeAuthNext } from '@/server/actions/auth-form';

/**
 * BR1.6: a signed-in visitor on /register or /sign-in goes on to a safe `next`, otherwise to the
 * one default `/{locale}/me` (BR1.5). An anonymous actor stays on the form.
 */
export function redirectSignedIn(actor: Actor, next: unknown): void {
  if (actor.kind !== 'account') return;
  redirect((safeAuthNext(next) ?? `/${actor.locale}/me`) as Route);
}
