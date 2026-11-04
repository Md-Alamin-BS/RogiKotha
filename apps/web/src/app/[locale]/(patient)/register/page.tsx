import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { RegisterForm } from '@/components/patient/auth/RegisterForm';
import { safeNextPath } from '@/server/actions/auth-form';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('register', t), ...noindex() };
}

// Port of app.js's renderRegister() (concept-04b, lines ~2115-2170); the heading is the
// prototype's own `.a-head`, so ViewShell renders none.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const t = await getTranslations();
  const { next } = (await searchParams) ?? {};
  return (
    <ViewShell view="register" title="">
      <section className="a-head">
        <span className="kicker">{t('auth.kicker')}</span>
        <h1 className="display">{titleForView('register', t)}</h1>
        <p className="lede">{t('auth.register.lede')}</p>
      </section>
      <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <RegisterForm next={safeNextPath(next)} />
      </section>
    </ViewShell>
  );
}
