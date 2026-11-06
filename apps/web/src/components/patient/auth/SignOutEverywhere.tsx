'use client';

import { useTranslations } from 'next-intl';
import { signOutEverywhereForm } from '@/server/actions/auth';
import { ErrorSummary } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'sign-out-all';

/**
 * WF7 step 5, BR6.4: sign out everywhere behind a native disclosure, so the explicit confirmation
 * works without JavaScript and asks for no password (Q7). A client component only so an
 * `internal` refusal is shown rather than lost.
 */
export function SignOutEverywhere() {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(signOutEverywhereForm);

  return (
    <details data-testid="sign-out-all">
      <summary>{t('auth.security.signOutAll')}</summary>
      <ErrorSummary
        form={FORM}
        fieldErrors={state.fieldErrors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <p className="sub">{t('auth.security.signOutAllNote')}</p>
      <form action={formAction} onSubmit={onSubmit} aria-busy={pending}>
        <input type="hidden" name="confirm" value="yes" />
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="sign-out-all-confirm-button"
        >
          {t('auth.security.signOutAllConfirm')}
        </button>
      </form>
    </details>
  );
}
