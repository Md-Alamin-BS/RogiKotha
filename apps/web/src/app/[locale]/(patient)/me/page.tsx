import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { ProfileWorkspace } from '@/components/patient/profile/ProfileWorkspace';
import { requireAccount } from '@/server/auth/session';
import { accounts } from '@/server/data';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('mine', t), ...noindex() };
}

// FR2: the signed-in user's own workspace. Signed-out readers are sent to sign in and back.
export default async function WorkspacePage() {
  const account = await requireAccount({ returnTo: '/me' });
  const [t, locale] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>]);
  const [profile, ownReviews] = await Promise.all([
    accounts.getProfile(account.accountId),
    accounts.listOwnReviews(account.accountId, locale),
  ]);
  // The session found the profile a moment ago; it can only vanish if it was deleted since.
  if (!profile) notFound();

  return (
    <ViewShell view="mine" title={titleForView('mine', t)}>
      <ProfileWorkspace profile={profile} reviews={ownReviews} locale={locale} />
    </ViewShell>
  );
}
