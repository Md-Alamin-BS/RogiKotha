import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { stripSlug } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { ExperiencePage } from '@/components/patient/experience/ExperiencePage';
import { getActor } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

type Params = Promise<{ id: string }>;
type SearchParams = Record<string, string | string[] | undefined>;

// WF6: one read per request, shared by the metadata and the page. A missing review gives the
// localised 404 before any markup, which is why `[id]` has no `loading.tsx`.
const loadExperience = cache(async (id: string) => {
  const publicId = stripSlug(id);
  if (!publicId) notFound();
  const result = await runCommand(getContainer().review.getExperience, { publicId });
  if (!result.ok) {
    if (result.error.code === 'not_found' || result.error.code === 'validation') notFound();
    throw new Error(`review.getExperience: ${result.error.code}`);
  }
  return { publicId, vm: result.data };
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const [t, { vm }] = await Promise.all([getTranslations(), loadExperience(id)]);
  // Indexable, and never the author's name in the title (WF6 step 7).
  return { title: `${vm.title} — ${t('brand.name')}` };
}

export default async function ExperienceRoute({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { publicId, vm } = await loadExperience(id);

  // The id and the authorship are resolved once, with the call shapes of functional-spec § 2.1.
  const c = getContainer();
  const actor = await getActor();
  const reviewId = await c.ports.unitOfWork.read((tx) =>
    c.review.reviewIdForPublicId(tx, { publicId }),
  );
  const isAuthor =
    reviewId !== null &&
    (await c.ports.unitOfWork.read((tx) => c.review.isReviewAuthor(tx, { reviewId, actor })));

  const search = await searchParams;
  const publishedParam = Array.isArray(search?.published) ? search.published[0] : search?.published;

  return (
    // ExperienceHead brings the page's only h1.
    <ViewShell view="account" title="">
      <ExperiencePage
        vm={vm}
        reviewPublicId={publicId}
        isAuthor={isAuthor}
        published={isAuthor && publishedParam === '1'}
      />
    </ViewShell>
  );
}
