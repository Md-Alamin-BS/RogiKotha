import type { Metadata } from 'next';
import {
  TAG_GROUPS,
  type ComposerDraftVM,
  type ComposerVM,
  type DraftSummaryVM,
  type Locale,
  type Result,
} from '@rogikotha/contracts';
import { getOwnAccountQuery } from '@rogikotha/application';
import { getLocale, getTranslations } from 'next-intl/server';
import { ContributionGatePanel } from '@/components/patient/auth/ContributionGate';
import { Composer } from '@/components/patient/compose/Composer';
import type { ComposerStep } from '@/components/patient/compose/composer-reducer';
import { DraftList } from '@/components/patient/compose/DraftList';
import { ViewShell } from '@/components/patient/ViewShell';
import { getContributionAccess } from '@/server/actions/account';
import { safeAuthNext } from '@/server/actions/auth-form';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('compose', t) };
}

type SearchParams = Record<string, string | string[] | undefined>;

/** At most this many doctors in the composer's list (WF1 step 2). */
const DOCTOR_OPTIONS = 100;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function stepOf(raw: string | undefined, draft: ComposerDraftVM | undefined): ComposerStep {
  const n = Number(raw ?? draft?.payload.step ?? 1);
  return n === 2 || n === 3 || n === 4 ? n : 1;
}

/** A failed read reaches the error boundary, as the other server reads do. */
function unwrap<T>(name: string, result: Result<T>): T {
  if (!result.ok) throw new Error(`${name}: ${result.error.code}`);
  return result.data;
}

// WF1: the gate first; only an `allowed` author loads the composer's data, all in parallel.
export default async function ComposerPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const doctorPublicId = firstValue(search?.doctor);
  const draftParam = firstValue(search?.draft);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const access = await getContributionAccess();

  if (access !== 'allowed') {
    // BR8.1: sign-in comes back to the same doctor; the gate drops any path it does not trust.
    const returnTo = `/${locale}/write${
      doctorPublicId ? `?doctor=${encodeURIComponent(doctorPublicId)}` : ''
    }`;
    return (
      <ViewShell view="compose" title={titleForView('compose', t)}>
        <p className="lede">{t('compose.intro')}</p>
        <ContributionGatePanel access={access} purpose="write" next={safeAuthNext(returnTo)} />
      </ViewShell>
    );
  }

  const c = getContainer();
  const config = await c.ports.config.current();
  const facilitiesOn = config.featureVisibility.facilityAccounts;
  const [doctors, branches, specialties, own, draftResult, drafts, ...suggested] =
    await Promise.all([
      runCommand(c.directory.listDoctors, { page: 1, pageSize: DOCTOR_OPTIONS }),
      facilitiesOn
        ? runCommand(c.directory.listFacilities, { page: 1, pageSize: DOCTOR_OPTIONS })
        : null,
      runCommand(c.taxonomy.listSpecialties, {}),
      runCommand(getOwnAccountQuery, {}),
      draftParam ? runCommand(c.review.getDraft, { draftId: draftParam }) : null,
      draftParam ? null : runCommand(c.review.listOwnDrafts, {}),
      ...TAG_GROUPS.map((group) => runCommand(c.taxonomy.listSuggested, { group })),
    ]);

  // A gone or unreadable `?draft=` starts a new draft and says so once (BR2.3).
  let draft: ComposerDraftVM | undefined;
  let draftMissing = false;
  if (draftResult) {
    if (draftResult.ok) draft = draftResult.data;
    else if (draftResult.error.code === 'not_found' || draftResult.error.code === 'validation') {
      draftMissing = true;
    } else unwrap('review.getDraft', draftResult);
  }
  const draftList: DraftSummaryVM[] = drafts ? unwrap('review.listOwnDrafts', drafts) : [];
  const ownAccount = unwrap('account.getOwnAccount', own);

  const suggestedTags = Object.fromEntries(
    TAG_GROUPS.map((group, index) => {
      const terms = unwrap('taxonomy.listSuggested', suggested[index]!);
      return [group, terms.map((term) => ({ termPublicId: term.publicId, name: term.name }))];
    }),
  ) as ComposerVM['suggestedTags'];

  const vm: ComposerVM = {
    doctors: unwrap('directory.listDoctors', doctors).items.map((d) => ({
      publicId: d.publicId,
      label: d.specialty ? `${d.name} — ${d.specialty}` : d.name,
    })),
    branches: branches
      ? unwrap('directory.listFacilities', branches).items.map((b) => ({
          publicId: b.publicId,
          label: `${b.name} — ${b.city}`,
        }))
      : [],
    specialties: unwrap('taxonomy.listSpecialties', specialties),
    suggestedTags,
    names: { named: ownAccount.displayName, pseudonymous: ownAccount.username },
    ...(draft ? { draft } : {}),
    emergencyNumbers: config.emergency,
  };

  return (
    <ViewShell view="compose" title={titleForView('compose', t)}>
      <p className="lede">{t('compose.intro')}</p>
      {draftList.length > 0 ? <DraftList drafts={draftList} /> : null}
      <Composer
        vm={vm}
        initialStep={stepOf(firstValue(search?.step), draft)}
        doctorPublicId={doctorPublicId}
        draftMissing={draftMissing}
      />
    </ViewShell>
  );
}
