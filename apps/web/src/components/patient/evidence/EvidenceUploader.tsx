'use client';

import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import {
  uploadEvidence,
  type EvidenceUploadState,
  type OwnEvidenceFile,
  type OwnEvidenceList,
} from '@/server/actions/evidence';

// The author's attachments on their own experience (FR5.1, FR5.2): their file list with its scan
// status and a one-file upload form. Markup and classes from concept-04b's evidence field and
// evFileHtml(); the redaction canvas and progress bar wait for the full release (Q3).
const INITIAL_STATE: EvidenceUploadState = { status: 'idle' };
const BYTES_PER_MB = 1024 * 1024;
const FILE_CLASS: Record<OwnEvidenceFile['status'], string> = {
  ready: 'ev-file done',
  pending: 'ev-file',
  rejected: 'ev-file bad',
};

function FileRow({ file }: { file: OwnEvidenceFile }) {
  const t = useTranslations();
  return (
    <div className={FILE_CLASS[file.status]} role="listitem" data-testid="evidence-file">
      <span>
        <b>{file.name ?? t('label.notProvided')}</b>
        <span className="state">{t(`ev.status.${file.status}`)}</span>
        {file.status === 'pending' && <span className="state">{t('ev.upload.pendingNote')}</span>}
        {file.status === 'rejected' && <span className="state">{t('ev.upload.rejectedNote')}</span>}
      </span>
    </div>
  );
}

export function EvidenceUploader({ reviewPublicId, files, maxFiles, maxBytes }: OwnEvidenceList) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [state, formAction, isPending] = useActionState(uploadEvidence, INITIAL_STATE);

  const limits = {
    maxMb: formatNumber(Math.round(maxBytes / BYTES_PER_MB), locale),
    maxFiles: formatNumber(maxFiles, locale),
  };
  const counted = files.filter((file) => file.status !== 'rejected').length;
  const canUpload = counted < maxFiles;
  const hasError = state.status === 'error';

  return (
    <div className="field" data-testid="evidence-uploader">
      <span className="lbl" id="evidence-uploader-head">
        {t('compose.evidence')} — {t('compose.optional')}
      </span>
      <p className="sub">{t('ev.upload.hint', limits)}</p>

      {files.length > 0 ? (
        <div className="ev-upload" role="list" aria-label={t('ev.upload.listLabel')}>
          {files.map((file) => (
            <FileRow key={file.publicId} file={file} />
          ))}
        </div>
      ) : (
        <p className="note">{t('label.noDocuments')}</p>
      )}

      {canUpload ? (
        <form action={formAction} style={{ marginTop: '12px' }} data-testid="evidence-upload-form">
          <input type="hidden" name="reviewPublicId" value={reviewPublicId} />
          {/* A block of its own: inline, the label ran straight into the file input. */}
          <label className="sub" htmlFor="evidence-file" style={{ display: 'block' }}>
            {t('ev.upload.fileLabel')}
          </label>
          <input
            id="evidence-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'evidence-file-error' : undefined}
            data-testid="evidence-file-input"
          />
          <button
            className="btn small ghost"
            type="submit"
            disabled={isPending}
            style={{ marginTop: '10px' }}
            data-testid="evidence-upload-submit"
          >
            {isPending ? t('ev.upload.uploading') : t('ev.upload.submit')}
          </button>
        </form>
      ) : (
        <p className="note">{t('ev.upload.limitReached', limits)}</p>
      )}

      {state.status === 'error' && (
        <p className="field-error" id="evidence-file-error" role="alert">
          {t(state.messageKey, limits)}
        </p>
      )}
      {state.status === 'uploaded' && (
        <p className="note" role="status">
          {t(state.messageKey, limits)}
        </p>
      )}
    </div>
  );
}
