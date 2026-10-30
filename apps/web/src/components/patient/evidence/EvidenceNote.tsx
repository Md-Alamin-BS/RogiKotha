import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

// The public side of attachments (FR5.3): the fixed evidence wording and how many files are ready.
// Never a file, a thumbnail or a file name. Markup from concept-04b's evidenceSection().
export function EvidenceNote({ count }: { count: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  if (count <= 0) return null;

  return (
    <section data-testid="evidence-note" aria-labelledby="evidence-note-head">
      <h2 className="section-head" id="evidence-note-head">
        {t('filter.evidence')}
      </h2>
      <div className="callout warn">
        <b>{t('evidence.status')}</b>
        {t('ev.note.count', { count: formatNumber(count, locale) })}
      </div>
    </section>
  );
}
