import {
  REVIEWER_LABEL_CODES,
  type OriginalTextVM,
  type ReviewSectionKey,
} from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { useLocale, useTranslations } from 'next-intl';

import { paragraphs } from '@/components/patient/experience/people';

const SECTION_ORDER: readonly ReviewSectionKey[] = ['symptoms', 'diagnosis', 'treatment', 'after'];
const CLAIM_CODES: readonly string[] = REVIEWER_LABEL_CODES;

// ASSUMPTION(U22): the version snapshot stores no language, so the script of the original decides:
// Bengali letters only gives `bn`, Latin letters only gives `en`, a mix gives nothing (the page's).
function languageOf(original: OriginalTextVM): Locale | undefined {
  const text = [original.title, original.story, ...Object.values(original.sections ?? {})].join(
    ' ',
  );
  const bengali = /[ঀ-৿]/.test(text);
  const latin = /[A-Za-z]/.test(text);
  if (bengali && !latin) return 'bn';
  if (latin && !bengali) return 'en';
  return undefined;
}

// The wording before a material correction, public to every reader (BR4.2). A key the snapshot
// lacks is left out; a null or empty value (empty before, and named by the correction) reads Not
// provided, as the page's flags do (review R-02).
export function OriginalText({ original }: { original: OriginalTextVM }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const language = languageOf(original);
  const lang = language !== undefined && language !== locale ? language : undefined;
  const notProvided = t('label.notProvided');
  const sections = SECTION_ORDER.flatMap((key) => {
    const body = original.sections?.[key];
    return body ? [{ key, body }] : [];
  });
  return (
    <details className="original-text" data-testid="original-text">
      <summary>{t('history.showOriginal')}</summary>
      <div lang={lang}>
        <h3 className="k">{t('history.originalHeading')}</h3>
        {original.title ? <p className="original-title">{original.title}</p> : null}
        {original.story
          ? paragraphs(original.story).map((text, index) => <p key={index}>{text}</p>)
          : null}
        {sections.length > 0 ? (
          <ol className="chapters">
            {sections.map((section) => (
              <li key={section.key}>
                <h4 className="k">{t(`compose.${section.key}`)}</h4>
                {paragraphs(section.body).map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </li>
            ))}
          </ol>
        ) : null}
        {original.sentiment !== undefined ? (
          <p className="note" data-testid="original-sentiment">
            {`${t('experience.sentimentLabel')}: ${
              original.sentiment === null ? notProvided : t(`sentiment.${original.sentiment}`)
            }`}
          </p>
        ) : null}
        {original.outcome !== undefined ? (
          <p className="note" data-testid="original-outcome">
            {`${t('experience.outcomeLabel')}: ${
              original.outcome === null ? notProvided : t(`outcome.${original.outcome}`)
            }`}
          </p>
        ) : null}
        {original.claims !== undefined && original.claims.length === 0 ? (
          <p className="note" data-testid="original-claims">
            {`${t('label.reviewerLabel')}: ${notProvided}`}
          </p>
        ) : null}
        {original.claims !== undefined && original.claims.length > 0 ? (
          <p data-testid="original-claims">
            {original.claims.map((claim) => (
              <span key={claim} className="reviewer-label">
                <b>{CLAIM_CODES.includes(claim) ? t(`claim.${claim}`) : claim}</b>
                <i>{t('label.reviewerLabel')}</i>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </details>
  );
}
