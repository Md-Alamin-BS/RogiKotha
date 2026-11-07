import type { OriginalTextVM, ReviewSectionKey } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { useLocale, useTranslations } from 'next-intl';

import { paragraphs } from '@/components/patient/experience/people';

const SECTION_ORDER: readonly ReviewSectionKey[] = ['symptoms', 'diagnosis', 'treatment', 'after'];
const CLAIM_CODES: readonly string[] = ['wrongDx', 'wrongRx', 'secondOpinion'];

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
// lacks is left out, never shown as "Not provided" or 0.
export function OriginalText({ original }: { original: OriginalTextVM }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const language = languageOf(original);
  const lang = language !== undefined && language !== locale ? language : undefined;
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
        {original.sentiment ? (
          <p className="note">
            {`${t('experience.sentimentLabel')}: ${t(`sentiment.${original.sentiment}`)}`}
          </p>
        ) : null}
        {original.outcome ? (
          <p className="note">
            {`${t('experience.outcomeLabel')}: ${t(`outcome.${original.outcome}`)}`}
          </p>
        ) : null}
        {original.claims !== undefined && original.claims.length > 0 ? (
          <p>
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
