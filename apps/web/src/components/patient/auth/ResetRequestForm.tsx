'use client';

import { useTranslations } from 'next-intl';
import { requestReset } from '@/server/actions/auth';
import { AuthField, ErrorSummary, FormNotice } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'reset-request';

/** WF5, BR5.1: asks for a reset link; the same "sent" answer replaces the form for any address. */
export function ResetRequestForm() {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(requestReset);

  if (state.status === 'done' && state.notice) {
    return <FormNotice notice={state.notice} testId="reset-request-notice" />;
  }
  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={state.fieldErrors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form
        id="reset-request-form"
        noValidate
        action={formAction}
        onSubmit={onSubmit}
        aria-busy={pending}
      >
        <AuthField
          form={FORM}
          name="email"
          labelKey="auth.email"
          type="email"
          autoComplete="email"
          maxLength={254}
          error={state.fieldErrors.email}
        />
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="reset-request-form-submit-button"
        >
          {t('auth.reset.submit')}
        </button>
      </form>
    </>
  );
}
