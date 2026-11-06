'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { confirmEmail } from '@/server/actions/auth';
import { ErrorSummary } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'confirm';

/**
 * WF3, BR3.1: opening the emailed link only renders this button; the POST confirms. After
 * hydration the token leaves the address bar, so it is not kept in history or shared by a copied
 * URL. A used or expired token swaps in the expired panel the page renders on the server.
 */
export function ConfirmEmailForm({
  token,
  expiredPanel,
}: {
  token: string;
  expiredPanel: ReactNode;
}) {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(confirmEmail);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token')) return;
    url.searchParams.delete('token');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);

  if (state.expired) return <>{expiredPanel}</>;
  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={state.fieldErrors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form
        id="confirm-form"
        noValidate
        action={formAction}
        onSubmit={onSubmit}
        aria-busy={pending}
      >
        <p>{t('auth.verify.confirmLede')}</p>
        <input type="hidden" name="token" value={token} />
        <button
          className="btn"
          type="submit"
          disabled={pending}
          data-testid="confirm-form-submit-button"
        >
          {t('auth.verify.confirm')}
        </button>
      </form>
    </>
  );
}
