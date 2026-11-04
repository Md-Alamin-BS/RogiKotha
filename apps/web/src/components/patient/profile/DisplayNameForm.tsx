'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { updateDisplayNameAction, type ProfileFormState } from '@/server/actions/profile';

const IDLE: ProfileFormState = { status: 'idle' };
const FIELD_ID = 'f-profile-displayName';
const ERROR_ID = 'err-profile-displayName';

// Port of the prototype's authField('register', 'displayName', …) (app.js renderRegister), bound
// to the FR2.2 rename action.
export function DisplayNameForm({ displayName }: { displayName: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(updateDisplayNameAction, IDLE);
  const errorKey = state.status === 'error' ? state.errorKey : null;
  const value = state.status === 'idle' ? displayName : (state.value ?? displayName);

  return (
    <form action={formAction} noValidate data-testid="profile-name-form">
      <div className="field">
        <label htmlFor={FIELD_ID}>
          {t('auth.displayName')}
          <span className="req">{t('compose.required')}</span>
        </label>
        <p className="sub">{t('mine.profile.nameNote')}</p>
        <input
          id={FIELD_ID}
          name="displayName"
          type="text"
          maxLength={60}
          autoComplete="nickname"
          defaultValue={value}
          aria-invalid={errorKey ? true : undefined}
          aria-describedby={errorKey ? ERROR_ID : undefined}
          data-testid="profile-name-input"
        />
        {errorKey ? (
          <p className="field-error" id={ERROR_ID}>
            {t(errorKey)}
          </p>
        ) : null}
      </div>
      <div className="mine-actions">
        <button
          className="btn small ghost"
          type="submit"
          disabled={pending}
          data-testid="profile-name-submit"
        >
          {t('mine.profile.saveName')}
        </button>
        <span className={state.status === 'saved' ? 'saved-flag on' : 'saved-flag'} role="status">
          {state.status === 'saved' ? t('mine.profile.nameSaved') : ''}
        </span>
      </div>
    </form>
  );
}
