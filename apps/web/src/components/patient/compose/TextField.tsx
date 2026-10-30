'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

// Port of concept-04b's `.field` with a label, the `.req` marker, an optional `.sub` hint and the
// `.field-error` message paired with aria-invalid/aria-describedby (D-001).
export function TextField({
  name,
  label,
  hint,
  multiline = false,
  defaultValue,
  onChange,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  defaultValue: string;
  onChange?: (value: string) => void;
  /** An i18n message key. */
  error?: string | undefined;
}) {
  const t = useTranslations();
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  const shared = {
    id: inputId,
    name,
    defaultValue,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    'data-testid': `compose-${name}`,
  } as const;
  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}
        <span className="req">{t('compose.required')}</span>
      </label>
      {hint ? (
        <p className="sub" id={hintId}>
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...shared} onChange={(e) => onChange?.(e.target.value)} />
      ) : (
        <input {...shared} type="text" onChange={(e) => onChange?.(e.target.value)} />
      )}
      {error ? (
        <p className="field-error" id={errorId}>
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}
