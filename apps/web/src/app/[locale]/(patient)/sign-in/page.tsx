import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { SignInForm } from '@/components/patient/auth/SignInForm';
import { safeNextPath } from '@/server/actions/auth-form';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('signin', t), ...noindex() };
}

// Port of app.js's renderSignin() (concept-04b, lines ~2173-2198); the heading is the prototype's
// own `.a-head`, so ViewShell renders none. `?next=` is kept only when it is a path on this site.
export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const t = await getTranslations();
  const { next } = (await searchParams) ?? {};
  return (
    <ViewShell view="signin" title="">
      <section className="a-head">
        <span className="kicker">{t('auth.kicker')}</span>
        <h1 className="display">{titleForView('signin', t)}</h1>
        <p className="lede">{t('auth.signIn.lede')}</p>
      </section>
      <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <SignInForm next={safeNextPath(next)} />
      </section>
    </ViewShell>
  );
}
