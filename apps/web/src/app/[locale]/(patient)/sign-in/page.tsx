import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Actor } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { AuthNotice } from '@/components/patient/auth/AuthNotice';
import { SignInForm } from '@/components/patient/auth/SignInForm';
import { getActor } from '@/server/auth';
import { safeAuthNext } from '@/server/actions/auth-form';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';
import { redirectSignedIn } from './signed-in-redirect';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('signin', t), ...noindex() };
}

interface SignInSearch {
  next?: string | string[];
  reset?: string | string[];
  signedOut?: string | string[];
}

/** WF4 step 1: at most one notice above the form, in this order (BR4.3). */
function noticeFor(actor: Actor, search: SignInSearch) {
  if (actor.refusal) return { messageKey: 'errors.auth.accountSuspended', tone: 'info' } as const;
  if (search.reset === 'done') return { messageKey: 'auth.reset.done', tone: 'done' } as const;
  if (search.signedOut === 'all') {
    return { messageKey: 'auth.security.signedOutAll', tone: 'info' } as const;
  }
  return null;
}

// Port of app.js's renderSignin() (concept-04b, lines ~2173-2198); the heading is the prototype's
// own `.a-head`, so ViewShell renders none. `?next=` is kept only when `safeAuthNext` accepts it.
export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<SignInSearch>;
}) {
  const search = (await searchParams) ?? {};
  const actor = await getActor();
  redirectSignedIn(actor, search.next);
  const t = await getTranslations();
  const notice = noticeFor(actor, search);
  return (
    <ViewShell view="signin" title="">
      <section className="a-head">
        <span className="kicker">{t('auth.kicker')}</span>
        <h1 className="display">{titleForView('signin', t)}</h1>
        <p className="lede">{t('auth.signIn.lede')}</p>
      </section>
      <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        {notice ? <AuthNotice {...notice} /> : null}
        <SignInForm next={safeAuthNext(search.next)} />
      </section>
    </ViewShell>
  );
}
