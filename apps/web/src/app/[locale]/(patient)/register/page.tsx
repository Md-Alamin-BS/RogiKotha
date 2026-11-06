import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { JoinSteps } from '@/components/patient/auth/JoinSteps';
import { RegisterForm } from '@/components/patient/auth/RegisterForm';
import { getActor } from '@/server/auth';
import { safeAuthNext } from '@/server/actions/auth-form';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';
import { redirectSignedIn } from '../sign-in/signed-in-redirect';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('register', t), ...noindex() };
}

// Port of app.js's renderRegister() (concept-04b, lines ~2115-2170); the heading is the
// prototype's own `.a-head`, so ViewShell renders none. WF1: step 1 of the joining strip.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const { next } = (await searchParams) ?? {};
  redirectSignedIn(await getActor(), next);
  const t = await getTranslations();
  return (
    <ViewShell view="register" title="">
      <section className="a-head">
        <span className="kicker">{t('auth.kicker')}</span>
        <h1 className="display">{titleForView('register', t)}</h1>
        <p className="lede">{t('auth.register.lede')}</p>
      </section>
      <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <JoinSteps current={1} />
        <RegisterForm next={safeAuthNext(next)} />
      </section>
    </ViewShell>
  );
}
