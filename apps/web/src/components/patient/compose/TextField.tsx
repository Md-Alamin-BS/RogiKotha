'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/contracts';
import { formatNumber } from '@rogikotha/i18n/format';

// Port of concept-04b's `.field` with a label, the `.req` marker, an optional `.sub` hint and the
// `.field-error` message paired with aria-invalid/aria-describedby (D-001).
export function TextField({
  name,
  label,
  hint,
  multiline = false,
  optional = false,
  minLength,
  defaultValue,
  onChange,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  /** Marks the field "Optional" instead of "Required". */
  optional?: boolean;
  /** Shows a live count while the text is shorter than this. */
  minLength?: number;
  defaultValue: string;
  onChange?: (value: string) => void;
  /** An i18n message key. */
  error?: string | undefined;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const id = useId();
  const [length, setLength] = useState(defaultValue.trim().length);
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const countId = `${id}-count`;
  const errorId = `${id}-error`;
  const showCount = minLength !== undefined && length < minLength;
  const describedBy = [hint ? hintId : null, showCount ? countId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');
  const handle = (value: string) => {
    setLength(value.trim().length);
    onChange?.(value);
  };
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
        <span className={optional ? 'req optional' : 'req'}>
          {t(optional ? 'compose.optional' : 'compose.required')}
        </span>
      </label>
      {hint ? (
        <p className="sub" id={hintId}>
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...shared} onChange={(e) => handle(e.target.value)} />
      ) : (
        <input {...shared} type="text" onChange={(e) => handle(e.target.value)} />
      )}
      {showCount ? (
        <p
          className="field-count"
          id={countId}
          aria-live="polite"
          data-testid={`compose-${name}-count`}
        >
          {t('compose.bodyCount', {
            count: formatNumber(length, locale),
            min: formatNumber(minLength, locale),
          })}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId}>
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}
