'use client';

import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';

import { removeEvidence, type OwnEvidenceList } from '@/server/actions/evidence';
import { EvidenceFileRow } from './EvidenceFileRow';

// The author's attachments on their own experience (FR5.1, FR5.2): their file list with each
// file's status and an upload form. Files go one request each to `POST /api/evidence/upload`;
// the server decides every limit, the checks here only save a round trip.
const UPLOAD_PATH = '/api/evidence/upload';
const BYTES_PER_MB = 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const SECONDS_PER_MINUTE = 60;

const MESSAGE_KEYS = [
  'errors.evidence.typeRejected',
  'errors.evidence.tooLarge',
  'errors.evidence.tooMany',
  'errors.evidence.totalTooLarge',
  'ev.upload.errors.noFile',
  'ev.upload.errors.signedOut',
  'ev.upload.errors.unconfirmed',
  'ev.upload.errors.notFound',
  'ev.upload.errors.rateLimited',
  'ev.upload.errors.tooLarge',
  'ev.upload.errors.tooMany',
  'ev.upload.errors.failed',
] as const;
type ErrorKey = (typeof MESSAGE_KEYS)[number];

type Outcome =
  { kind: 'idle' } | { kind: 'done' } | { kind: 'error'; messageKey: ErrorKey; minutes?: number };

function isErrorKey(value: unknown): value is ErrorKey {
  return typeof value === 'string' && (MESSAGE_KEYS as readonly string[]).includes(value);
}

/** The route's refusal body, reduced to a copy key; anything unexpected reads as "failed". */
async function refusalOf(response: Response): Promise<Outcome> {
  try {
    const body = (await response.json()) as {
      error?: { messageKey?: unknown; retryAfterSec?: unknown };
    };
    const key = body.error?.messageKey;
    const retry = body.error?.retryAfterSec;
    return {
      kind: 'error',
      messageKey: isErrorKey(key) ? key : 'ev.upload.errors.failed',
      ...(typeof retry === 'number'
        ? { minutes: Math.max(1, Math.ceil(retry / SECONDS_PER_MINUTE)) }
        : {}),
    };
  } catch {
    return { kind: 'error', messageKey: 'ev.upload.errors.failed' };
  }
}

export function EvidenceUploader({ reviewPublicId, files, maxFiles, maxBytes }: OwnEvidenceList) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  const maxMb = Math.round(maxBytes / BYTES_PER_MB);
  const limits = { maxMb: formatNumber(maxMb, locale), maxFiles: formatNumber(maxFiles, locale) };
  // A `failed` or `rejected` file stops counting (BR6.1).
  const counted = files.filter(
    (file) => file.status === 'pending' || file.status === 'ready',
  ).length;
  const canUpload = counted < maxFiles;

  function precheck(chosen: File[]): Outcome | null {
    if (chosen.length === 0) return { kind: 'error', messageKey: 'ev.upload.errors.noFile' };
    if (counted + chosen.length > maxFiles) {
      return { kind: 'error', messageKey: 'ev.upload.errors.tooMany' };
    }
    if (chosen.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      return { kind: 'error', messageKey: 'errors.evidence.typeRejected' };
    }
    if (chosen.some((file) => file.size > maxBytes)) {
      return { kind: 'error', messageKey: 'ev.upload.errors.tooLarge' };
    }
    return null;
  }

  async function uploadOne(file: File): Promise<Outcome> {
    const body = new FormData();
    body.set('reviewPublicId', reviewPublicId);
    body.set('idempotencyKey', crypto.randomUUID());
    body.set('file', file);
    try {
      const response = await fetch(UPLOAD_PATH, { method: 'POST', body });
      return response.ok ? { kind: 'done' } : await refusalOf(response);
    } catch {
      return { kind: 'error', messageKey: 'ev.upload.errors.failed' };
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const input = inputRef.current;
    const chosen = Array.from(input?.files ?? []);
    const refused = precheck(chosen);
    if (refused) {
      setOutcome(refused);
      return;
    }
    setBusy(true);
    setOutcome({ kind: 'idle' });
    let result: Outcome = { kind: 'idle' };
    let uploaded = 0;
    for (const file of chosen) {
      result = await uploadOne(file);
      if (result.kind === 'error') break;
      uploaded += 1;
    }
    if (uploaded > 0 && input) input.value = '';
    setOutcome(result);
    setBusy(false);
    if (uploaded > 0) router.refresh();
  }

  async function onRemove(publicId: string) {
    setRemovingId(publicId);
    const result = await removeEvidence(publicId);
    setRemovingId(null);
    if (result.status === 'error') {
      setOutcome({ kind: 'error', messageKey: result.messageKey });
      return;
    }
    setOutcome({ kind: 'idle' });
    router.refresh();
  }

  const message =
    outcome.kind === 'done'
      ? t('ev.upload.done.received')
      : outcome.kind === 'error'
        ? t(outcome.messageKey, {
            ...limits,
            minutes: formatNumber(outcome.minutes ?? 1, locale),
          })
        : '';

  return (
    <div className="field" data-testid="evidence-uploader">
      <span className="lbl" id="evidence-uploader-head">
        {t('compose.evidence')} — {t('compose.optional')}
      </span>
      <p className="sub">{t('ev.upload.hint', limits)}</p>

      {files.length > 0 ? (
        <div className="ev-upload" role="list" aria-label={t('ev.upload.listLabel')}>
          {files.map((file) => (
            <EvidenceFileRow
              key={file.publicId}
              file={file}
              maxMb={maxMb}
              onRemove={(id) => void onRemove(id)}
              removing={removingId === file.publicId}
            />
          ))}
        </div>
      ) : (
        <p className="note">{t('label.noDocuments')}</p>
      )}

      {canUpload ? (
        <form
          onSubmit={(event) => void onSubmit(event)}
          style={{ marginTop: '12px' }}
          data-testid="evidence-upload-form"
        >
          {/* A block of its own: inline, the label ran straight into the file input. */}
          <label className="sub" htmlFor="evidence-file" style={{ display: 'block' }}>
            {t('ev.upload.fileLabel')}
          </label>
          <input
            ref={inputRef}
            id="evidence-file"
            name="file"
            type="file"
            multiple
            accept="image/jpeg,image/png"
            aria-invalid={outcome.kind === 'error' || undefined}
            aria-describedby="evidence-upload-message"
            data-testid="evidence-file-input"
          />
          <button
            className="btn small ghost"
            type="submit"
            disabled={busy}
            style={{ marginTop: '10px' }}
            data-testid="evidence-upload-submit"
          >
            {busy ? t('ev.upload.uploading') : t('ev.upload.submit')}
          </button>
        </form>
      ) : (
        <p className="note">{t('ev.upload.limitReached', limits)}</p>
      )}

      {/* Always mounted so a screen reader announces the text when it appears; focus stays put. */}
      <p
        id="evidence-upload-message"
        className={outcome.kind === 'error' ? 'field-error' : 'note'}
        role="status"
        aria-live="polite"
        data-testid="evidence-upload-message"
      >
        {message}
      </p>
    </div>
  );
}
