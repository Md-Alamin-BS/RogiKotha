import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Result } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { Home } from '@/components/patient/home/Home';
import { browseConditions, pickChips } from '@/components/patient/home/pick-chips';
import { getActor } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import { documentTitle } from '@/lib/titles';

// The prototype's home shows three facility branches and four of the latest accounts
// (renderDiscover, app.js 472-539).
const FACILITY_COUNT = 3;
const LATEST_COUNT = 4;

type Section = 'conditions' | 'facilities' | 'latest';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('discover', t) };
}

// WF2: read per request, never cached (BR1.1); a failed list leaves out only its own section (BR1.6).
export default async function DiscoverPage() {
  const { locale, correlationId } = await getActor();
  const container = getContainer();

  const [conditions, facilities, latest] = await Promise.allSettled([
    runCommand(container.taxonomy.listConditions, {}),
    runCommand(container.directory.listFacilities, { page: 1, pageSize: FACILITY_COUNT }),
    runCommand(container.reviewReads.listExperienceCards, { limit: LATEST_COUNT }),
  ]);
  // Unguarded: the defaults-only provider cannot fail, so a throw here is a programming error.
  const config = await container.ports.config.current();

  function settle<T>(section: Section, outcome: PromiseSettledResult<Result<T>>): T | null {
    if (outcome.status === 'fulfilled' && outcome.value.ok) return outcome.value.data;
    // ASSUMPTION(U20): the closed LogFields list has no `section` field, so the section name rides
    // in `kind`; adding `section` to the port is the owner's call (ISSUES.md S4 row).
    container.ports.logger.warn('discover.section_unavailable', { kind: section, correlationId });
    return null;
  }

  const conditionList = settle('conditions', conditions);
  const facilityPage = settle('facilities', facilities);
  const latestPage = settle('latest', latest);

  return (
    // The opener brings the page's only h1.
    <ViewShell view="discover" title="">
      <Home
        chips={conditionList ? pickChips(conditionList, locale) : []}
        browse={conditionList ? browseConditions(conditionList) : null}
        facilities={facilityPage ? facilityPage.items : null}
        latest={latestPage ? latestPage.items : null}
        emergency={config.emergency}
      />
    </ViewShell>
  );
}
