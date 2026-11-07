'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

// The prototype's `.callout.warn` error summary (authErrorSummary): focused after a refused
// submission so keyboard and screen-reader users land on it.
export function FormErrorSummary({
  attempt,
  error,
  fields = [],
  onField,
}: {
  attempt: number;
  error: string | null;
  /** i18n label keys of the refused fields, listed so the author knows where to look. */
  fields?: string[];
  /** When given, each listed field is a button that takes the author to it. */
  onField?: (label: string) => void;
}) {
  const t = useTranslations();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (attempt > 0 && error) ref.current?.focus();
  }, [attempt, error]);
  if (!error) return null;
  return (
    <div
      className="callout warn form-errors"
      role="alert"
      tabIndex={-1}
      ref={ref}
      data-testid="compose-error"
    >
      <b>{t(error)}</b>
      {fields.length > 0 ? (
        <>
          <span className="sub">{t('compose.errorFields')}</span>
          <ul data-testid="compose-error-fields">
            {fields.map((label) => (
              <li key={label}>
                {onField ? (
                  <button type="button" className="btn ghost small" onClick={() => onField(label)}>
                    {t(label)}
                  </button>
                ) : (
                  t(label)
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
