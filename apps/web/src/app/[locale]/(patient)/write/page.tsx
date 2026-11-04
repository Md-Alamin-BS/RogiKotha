import type { Metadata } from 'next';
import type { Locale } from '@rogikotha/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { ComposeForm } from '@/components/patient/compose/ComposeForm';
import { periodOptions, periodValue } from '@/components/patient/compose/period';
import { ViewShell } from '@/components/patient/ViewShell';
import { requireAccount } from '@/server/auth/session';
import { doctors } from '@/server/data';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('compose', t) };
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ComposerPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const requestedDoctor = firstValue((await searchParams)?.doctor);
  const account = await requireAccount({
    returnTo: requestedDoctor ? `/write?doctor=${encodeURIComponent(requestedDoctor)}` : '/write',
  });
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const [options, specialties] = await Promise.all([
    doctors.listDoctorOptions(locale),
    doctors.listSpecialtyOptions(locale),
  ]);
  // `?doctor=` may carry the uuid or the public id, as the doctor page's link chooses.
  const prefilled = options.find((d) => d.id === requestedDoctor || d.publicId === requestedDoctor);
  const now = new Date();

  return (
    <ViewShell view="compose" title={titleForView('compose', t)}>
      <p className="lede">{t('compose.intro')}</p>
      <ComposeForm
        doctors={options.map((d) => ({
          id: d.id,
          label: d.specialty ? `${d.name} — ${d.specialty}` : d.name,
        }))}
        specialties={specialties}
        periods={periodOptions(now, locale)}
        names={{
          named: account.displayName,
          pseudonymous: account.pseudonymousDisplayName ?? account.username,
        }}
        defaults={{
          doctorId: prefilled?.id ?? '',
          relationship: 'self',
          period: periodValue(now.getUTCFullYear(), now.getUTCMonth() + 1),
          title: '',
          body: '',
          sentiment: '',
          outcome: '',
          // ASSUMPTION(demo-slice): the username is preselected, as in the prototype's composer.
          identity: 'pseudonymous',
          newDoctor: '',
          newDoctorName: '',
          newDoctorSpecialtyId: '',
          newDoctorChamber: '',
          newDoctorBmdc: '',
        }}
      />
    </ViewShell>
  );
}
