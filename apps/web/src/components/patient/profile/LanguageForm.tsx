'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { LOCALES, type Locale } from '@rogikotha/contracts';

import { updateLanguageAction, type ProfileFormState } from '@/server/actions/profile';

const IDLE: ProfileFormState = { status: 'idle' };
const ERROR_ID = 'err-profile-locale';

// Port of the prototype's `#pref-lang` opt-row (app.js renderMine, "Preferences"). Each option
// submits the form, so the choice is saved to the account rather than to this device only.
export function LanguageForm({ current }: { current: Locale }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(updateLanguageAction, IDLE);
  const errorKey = state.status === 'error' ? state.errorKey : null;

  return (
    <form action={formAction} data-testid="profile-language-form">
      <div className="field">
        <span className="lbl" id="profile-language-label">
          {t('auth.language')}
        </span>
        <p className="sub">{t('mine.profile.languageNote')}</p>
        <div
          className="opt-row"
          role="group"
          aria-labelledby="profile-language-label"
          aria-describedby={errorKey ? ERROR_ID : undefined}
        >
          {LOCALES.map((locale) => (
            <button
              key={locale}
              className="opt"
              type="submit"
              name="locale"
              value={locale}
              lang={locale}
              aria-pressed={locale === current}
              disabled={pending}
              data-testid={`profile-language-${locale}`}
            >
              {t(`user2.lang.${locale}`)}
            </button>
          ))}
        </div>
        {errorKey ? (
          <p className="field-error" id={ERROR_ID}>
            {t(errorKey)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
