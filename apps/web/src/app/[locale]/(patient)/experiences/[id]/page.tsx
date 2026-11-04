import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { stripSlug } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { CommentThread } from '@/components/patient/comments/CommentThread';
import { AuthorEvidence } from '@/components/patient/evidence/AuthorEvidence';
import { EvidenceNote } from '@/components/patient/evidence/EvidenceNote';
import { AuthorTools } from '@/components/patient/experience/AuthorTools';
import { ExperienceDetail } from '@/components/patient/experience/ExperienceDetail';
import { getCurrentAccount } from '@/server/auth/session';
import { comments, reviews } from '@/server/data';
import { documentTitle } from '@/lib/titles';

type Params = Promise<{ id: string }>;

// One lookup per request, shared by the metadata and the page.
const loadExperience = cache(async (param: string) => {
  const publicId = stripSlug(param);
  if (!publicId) return null;
  const locale = (await getLocale()) as Locale;
  return reviews.getReviewByPublicId(publicId, locale);
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const [t, review] = await Promise.all([getTranslations(), loadExperience(id)]);
  return { title: review ? `${review.title} — ${t('brand.name')}` : documentTitle('account', t) };
}

export default async function ExperiencePage({ params }: { params: Params }) {
  const { id } = await params;
  const review = await loadExperience(id);
  if (!review) notFound();

  const account = await getCurrentAccount();
  const [threads, ownReview] = await Promise.all([
    comments.listComments(review.id, account?.accountId ?? null),
    account ? reviews.getOwnReviewForEdit(review.publicId, account.accountId) : null,
  ]);

  return (
    <ViewShell view="account" title="">
      <ExperienceDetail
        review={review}
        evidence={<EvidenceNote count={review.readyEvidenceCount} />}
        authorTools={
          ownReview ? (
            <AuthorTools
              reviewPublicId={review.publicId}
              uploader={<AuthorEvidence reviewPublicId={review.publicId} />}
            />
          ) : null
        }
        discussion={
          <CommentThread
            reviewPublicId={review.publicId}
            threads={threads}
            signedIn={account !== null}
          />
        }
      />
    </ViewShell>
  );
}
