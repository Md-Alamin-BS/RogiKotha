'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

// The prototype's `.callout.warn` error summary (authErrorSummary): focused after a refused
// submission so keyboard and screen-reader users land on it.
export function FormErrorSummary({
  attempt,
  error,
  fields = [],
}: {
  attempt: number;
  error: string | null;
  /** i18n label keys of the refused fields, listed so the author knows where to look. */
  fields?: string[];
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
              <li key={label}>{t(label)}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
