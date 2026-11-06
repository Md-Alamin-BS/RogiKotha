'use client';

import { useTranslations } from 'next-intl';
import { resendLink } from '@/server/actions/auth';
import { AuthField, ErrorSummary, FormNotice } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'resend';

/**
 * BR2.4: the signed-out resend. The address comes pre-filled from `rk.pending` when there is one;
 * the answer is the same "a new link is on its way" for any address.
 */
export function ResendLinkForm({ defaultEmail }: { defaultEmail: string }) {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(resendLink);

  if (state.status === 'done' && state.notice) {
    return <FormNotice notice={state.notice} testId="resend-notice" />;
  }
  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={state.fieldErrors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form id="resend-form" noValidate action={formAction} onSubmit={onSubmit} aria-busy={pending}>
        <AuthField
          form={FORM}
          name="email"
          labelKey="auth.email"
          type="email"
          autoComplete="email"
          maxLength={254}
          defaultValue={defaultEmail}
          error={state.fieldErrors.email}
        />
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="resend-form-submit-button"
        >
          {t('auth.verify.resend')}
        </button>
      </form>
    </>
  );
}
