'use client';

import { useTranslations } from 'next-intl';
import { resendOwnLink } from '@/server/actions/auth';
import { ErrorSummary, FormNotice } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'resend-own';

/**
 * BR2.5: a signed-in, unconfirmed holder asks for a new link with one button. No address is typed
 * or shown; the answer replaces the button.
 */
export function ResendOwnButton() {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(resendOwnLink);

  if (state.status === 'done' && state.notice) {
    return <FormNotice notice={state.notice} testId="resend-own-notice" />;
  }
  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={state.fieldErrors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form action={formAction} onSubmit={onSubmit} aria-busy={pending}>
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="resend-own-submit-button"
        >
          {t('auth.verify.resend')}
        </button>
      </form>
    </>
  );
}
