import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { SecuritySettings } from '@/components/patient/auth/SecuritySettings';
import { getOwnAccount, listSessions } from '@/server/actions/account';
import { requireAccount } from '@/server/auth/session';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('security', t), ...noindex() };
}

interface SecuritySearch {
  changed?: string | string[];
}

// WF7, BR6.1-BR6.5: signed-in only, rendered per request. The two queries run in parallel and a
// failed one blanks only its own section. `?changed=1` is where a password change lands (ISS-778).
export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams?: Promise<SecuritySearch>;
}) {
  const search = (await searchParams) ?? {};
  const locale = (await getLocale()) as Locale;
  // BR6.1: the locale-prefixed path, because `safeAuthNext` on sign-in refuses one without it.
  await requireAccount({ returnTo: `/${locale}/me/security` });
  const [t, account, sessions] = await Promise.all([
    getTranslations(),
    getOwnAccount({}),
    listSessions({}),
  ]);
  return (
    <ViewShell view="security" title={titleForView('security', t)}>
      <SecuritySettings
        account={account.ok ? account.data : null}
        sessions={sessions.ok ? sessions.data : null}
        locale={locale}
        passwordChanged={search.changed === '1'}
      />
    </ViewShell>
  );
}
