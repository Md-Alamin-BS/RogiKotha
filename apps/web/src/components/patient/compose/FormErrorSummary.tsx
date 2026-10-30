'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

// The prototype's `.callout.warn` error summary (authErrorSummary): focused after a refused
// submission so keyboard and screen-reader users land on it.
export function FormErrorSummary({ attempt, error }: { attempt: number; error: string | null }) {
  const t = useTranslations();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (attempt > 0 && error) ref.current?.focus();
  }, [attempt, error]);
  if (!error) return null;
  return (
    <div className="callout warn" role="alert" tabIndex={-1} ref={ref} data-testid="compose-error">
      <b>{t(error)}</b>
    </div>
  );
}
