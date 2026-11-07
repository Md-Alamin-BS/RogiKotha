'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { discardDraftAction } from '@/server/actions/review';

// Discard with a confirmation (BR2.6). The action revalidates /write; the refresh shows the shorter
// list. A refusal is shown beside the button with its message key, never raw text.
export function DiscardDraftButton({ draftId, label }: { draftId: string; label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const discard = () => {
    if (!window.confirm(t('compose.drafts.discardConfirm'))) return;
    startTransition(async () => {
      const answer = await discardDraftAction({ draftId });
      if (answer.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(answer.messageKey);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn ghost small"
        disabled={pending}
        onClick={discard}
        aria-label={`${t('compose.drafts.discard')}: ${label}`}
        data-testid="draft-discard"
      >
        {t('compose.drafts.discard')}
      </button>
      {error ? (
        <span className="field-error" role="alert">
          {t(error)}
        </span>
      ) : null}
    </>
  );
}
