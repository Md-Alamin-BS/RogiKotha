'use client';

import { useTranslations } from 'next-intl';

const EXCERPT_LENGTH = 220;
const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'positive',
  mixed: 'mixed',
  negative: 'negative',
};

function initialsOf(name: string, pseudonymous: boolean): string {
  const bare = name.replace(/^(Dr\.?|ডা\.?)\s+/, '');
  if (pseudonymous) return `@${bare.charAt(0)}`;
  const parts = bare.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return first + last;
}

// Port of concept-04b's renderPreview(): the byline at real size, the doctor, the sentiment or
// "Not provided", the outcome and the start of the story, as readers will see them.
export function ComposePreview({
  authorName,
  identity,
  relationship,
  doctorName,
  sentiment,
  outcome,
  body,
}: {
  authorName: string;
  identity: string;
  relationship: string;
  doctorName: string | null;
  sentiment: string;
  outcome: string;
  body: string;
}) {
  const t = useTranslations();
  const pseudonymous = identity === 'pseudonymous';
  const identityKey = pseudonymous ? 'pseudo' : 'real';
  const excerpt = body.trim().slice(0, EXCERPT_LENGTH);
  return (
    <section className="panel preview-card" data-testid="compose-preview">
      <span className="k">{t('compose.preview')}</span>
      <div>
        <span className="byline">
          <span className="byline-av" data-identity={identityKey} aria-hidden="true">
            {initialsOf(authorName, pseudonymous)}
          </span>
          <span className="byline-lede">{t('byline.yourIdentity')}</span>
          <span className="byline-name">{authorName}</span>
          <span className="byline-id" data-identity={identityKey}>
            {t(`byline.identity.${identityKey}`)}
          </span>
          {relationship ? <span className="byline-rel">{t(`rel.${relationship}`)}</span> : null}
        </span>
        <p className="denominator">{doctorName ?? t('label.notProvided')}</p>
        {sentiment && SENTIMENT_BADGE[sentiment] ? (
          <span className={`badge ${SENTIMENT_BADGE[sentiment]}`}>
            {t(`sentiment.${sentiment}`)}
          </span>
        ) : (
          <span className="badge plain">{t('label.notProvided')}</span>
        )}{' '}
        {outcome ? <span className="badge plain">{t(`outcome.${outcome}`)}</span> : null}
        <p className="note">{excerpt || t('compose.previewEmpty')}</p>
      </div>
    </section>
  );
}
