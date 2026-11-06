import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { ResetRequestForm } from '@/components/patient/auth/ResetRequestForm';
import { SetPasswordForm } from '@/components/patient/auth/SetPasswordForm';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // BR1.4: the emailed link carries `?token=`, so it must not leak through Referer.
  return { title: documentTitle('reset', t), ...noindex(), referrer: 'no-referrer' };
}

// WF5 and WF6: the request form, or the new-password form when the emailed link's token is here.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  const { token } = (await searchParams) ?? {};
  const t = await getTranslations();
  const resetToken = typeof token === 'string' && token !== '' ? token : null;
  return (
    <ViewShell view="reset" title="">
      <section className="a-head">
        <span className="kicker">{t('auth.kicker')}</span>
        <h1 className="display">{titleForView('reset', t)}</h1>
        {resetToken ? null : <p className="lede">{t('auth.reset.lede')}</p>}
      </section>
      <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        {resetToken ? <SetPasswordForm token={resetToken} /> : <ResetRequestForm />}
      </section>
    </ViewShell>
  );
}
