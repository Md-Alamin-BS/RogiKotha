import type { OwnEvidenceFile } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const FILE_CLASS: Record<OwnEvidenceFile['status'], string> = {
  ready: 'ev-file done',
  pending: 'ev-file',
  rejected: 'ev-file bad',
  failed: 'ev-file bad',
};

export interface EvidenceFileRowProps {
  file: OwnEvidenceFile;
  /** The per-file limit in MB, for the "larger than" reason. */
  maxMb: number;
  /** Called with the file's public id; the parent owns the server call. */
  onRemove: (publicId: string) => void;
  removing?: boolean;
}

// One of the author's files with its status. Presentational on purpose: the client uploader
// renders it and passes the Remove call in, so this file imports nothing from the server.
export function EvidenceFileRow({ file, maxMb, onRemove, removing = false }: EvidenceFileRowProps) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const name = file.name ?? t('label.notProvided');
  const final = file.status === 'rejected' || file.status === 'failed';
  const size =
    file.size >= BYTES_PER_MB
      ? t('ev.size.mb', {
          size: formatNumber(Math.round((file.size / BYTES_PER_MB) * 10) / 10, locale),
        })
      : t('ev.size.kb', {
          size: formatNumber(Math.max(1, Math.round(file.size / BYTES_PER_KB)), locale),
        });

  return (
    <div className={FILE_CLASS[file.status]} role="listitem" data-testid="evidence-file">
      <span>
        <b>{name}</b>
        <span className="state">
          {t(`ev.status.${file.status}`)} · {size}
        </span>
        {final && (
          <>
            {file.reasonKey && (
              <span className="state" data-testid="evidence-file-reason">
                {t(file.reasonKey as 'ev.reason.malware', {
                  maxMb: formatNumber(maxMb, locale),
                })}
              </span>
            )}
            <span className="state">{t('ev.guidance.photograph')}</span>
            <span className="state">{t('ev.failNote')}</span>
          </>
        )}
      </span>
      <button
        type="button"
        className="btn small ghost"
        aria-label={t('ev.removeNamed', { name })}
        disabled={removing}
        onClick={() => onRemove(file.publicId)}
        data-testid="evidence-file-remove"
      >
        {t('ev.remove')}
      </button>
    </div>
  );
}
