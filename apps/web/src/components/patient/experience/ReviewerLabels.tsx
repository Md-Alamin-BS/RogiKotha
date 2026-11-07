import type { ExperienceClaimVM } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

// The author's claims (concept-04b renderAccount, `.reviewer-label`). Each is framed as the
// author's own label, never as a platform finding (BR5.3); a stored label with no code is shown as
// written (FD-111).
export function ReviewerLabels({ claims }: { claims: readonly ExperienceClaimVM[] }) {
  const t = useTranslations();
  if (claims.length === 0) return null;
  return (
    <div data-testid="reviewer-labels">
      <p>
        {claims.map((claim) => {
          const text = 'code' in claim ? t(`claim.${claim.code}`) : claim.text;
          return (
            <span key={text} className="reviewer-label">
              <b>{text}</b>
              <i>{t('label.reviewerLabel')}</i>
            </span>
          );
        })}
      </p>
      <p className="note">{t('label.reviewerLabelWhy')}</p>
    </div>
  );
}
