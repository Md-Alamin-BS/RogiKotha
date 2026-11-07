import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

// The public side of attachments (FR5.3): the fixed evidence wording and how many files are
// attached, or No documents. Never a file, a thumbnail, a file name, a state or a 0 (BR5.3).
export function EvidenceNote({ count }: { count: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  if (count <= 0) {
    return (
      <section aria-labelledby="evidence-none-head" data-testid="evidence-none">
        <h2 className="section-head" id="evidence-none-head">
          {t('filter.evidence')}
        </h2>
        <p className="note">{t('label.noDocuments')}</p>
      </section>
    );
  }

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
