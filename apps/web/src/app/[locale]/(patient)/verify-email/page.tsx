import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { ConfirmEmailForm } from '@/components/patient/auth/ConfirmEmailForm';
import { JoinSteps } from '@/components/patient/auth/JoinSteps';
import { PendingPanel } from '@/components/patient/auth/PendingPanel';
import { VerifyDone } from '@/components/patient/auth/VerifyDone';
import { getActor } from '@/server/auth';
import { PENDING_EMAIL_COOKIE, readPendingCookie, safeAuthNext } from '@/server/actions/auth-form';
import { optionalEnv } from '@/server/env';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

// ASSUMPTION(U9): the local inbox is the compose Mailpit web UI on its published port 8025
// (infra/compose/docker-compose.yml); no setting names it yet.
const DEV_INBOX_URL = 'http://localhost:8025';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // BR1.4: the emailed link carries `?token=`, so it must not leak through Referer.
  return { title: documentTitle('verify', t), ...noindex(), referrer: 'no-referrer' };
}

interface VerifySearch {
  token?: string | string[];
  confirmed?: string | string[];
  next?: string | string[];
}

function single(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

// WF2, WF3, functional-spec § 4.1: one of the confirm, done or pending (or expired) panels, chosen
// per request. Opening the page never confirms anything; only the confirm form's POST does (BR3.1).
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<VerifySearch>;
}) {
  const search = (await searchParams) ?? {};
  const [t, actor, cookieStore] = await Promise.all([getTranslations(), getActor(), cookies()]);
  const signedIn = actor.kind === 'account';
  const verified = signedIn && actor.emailVerified === true;
  const token = single(search.token);

  // BR3.2: a typed `confirmed=1` shows the done panel only to an actor who really is verified.
  if (!token && verified && search.confirmed !== '1') redirect(`/${actor.locale}/me`);

  const pending = signedIn ? null : readPendingCookie(cookieStore.get(PENDING_EMAIL_COOKIE)?.value);
  const next = safeAuthNext(search.next) ?? pending?.next ?? null;
  const devInboxUrl = optionalEnv('APP_MODE') === 'production' ? null : DEV_INBOX_URL;
  const pendingPanel = (expired: boolean) => (
    <PendingPanel
      address={pending?.email ?? null}
      signedIn={signedIn}
      expired={expired}
      next={next}
      devInboxUrl={devInboxUrl}
    />
  );

  let step: 2 | 3 = 2;
  let panel;
  if (token) {
    panel = <ConfirmEmailForm token={token} expiredPanel={pendingPanel(true)} />;
  } else if (verified) {
    step = 3;
    panel = <VerifyDone next={safeAuthNext(search.next)} />;
  } else {
    panel = pendingPanel(false);
  }

  return (
    <ViewShell view="verify" title="">
      <section className="a-head">
        <span className="kicker">{t('auth.kicker')}</span>
        <h1 className="display">{titleForView('verify', t)}</h1>
      </section>
      <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <JoinSteps current={step} />
        {panel}
      </section>
    </ViewShell>
  );
}
