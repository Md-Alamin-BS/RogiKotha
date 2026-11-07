import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { AuthorProfile } from '@/components/patient/experience/AuthorProfile';
import { redirect } from '@/i18n/routing';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import { noindex } from '@/lib/metadata';
import { documentTitle } from '@/lib/titles';

type Params = Promise<{ username: string }>;
type SearchParams = Record<string, string | string[] | undefined>;

// WF8: an unknown username and one with no public experience both answer an empty page with
// status 200.
async function loadAuthor(username: string, cursor: string | undefined) {
  const result = await runCommand(getContainer().review.authorCards, {
    username,
    ...(cursor !== undefined ? { cursor } : {}),
  });
  if (result.ok) return result.data;
  if (result.error.code === 'validation') {
    // ASSUMPTION(U47): as on the index (WF7), a bad cursor goes back to the newest page (307).
    if (cursor !== undefined) {
      const locale = (await getLocale()) as Locale;
      redirect({ href: `/authors/${encodeURIComponent(username)}`, locale });
    }
    // ASSUMPTION(U47): a username the schema refuses gets the same empty page as an unknown one.
    return { header: { username }, page: { items: [] } };
  }
  throw new Error(`review.authorCards: ${result.error.code}`);
}

function cursorOf(search: SearchParams | undefined): string | undefined {
  return Array.isArray(search?.cursor) ? search.cursor[0] : search?.cursor;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // ASSUMPTION(U47): the tab keeps the view name, so a typed URL is never echoed into the title.
  return { title: documentTitle('person', t), ...noindex() };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<SearchParams>;
}) {
  const [{ username }, search] = await Promise.all([params, searchParams]);
  const cursor = cursorOf(search);
  const { header, page } = await loadAuthor(username, cursor);
  return (
    // AuthorProfile brings the page's only h1.
    <ViewShell view="person" title="">
      <AuthorProfile
        header={header}
        cards={page.items}
        nextCursor={page.nextCursor}
        isLaterPage={cursor !== undefined}
      />
    </ViewShell>
  );
}
