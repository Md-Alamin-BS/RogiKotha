'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

export interface Option {
  value: string;
  label: string;
  /** `pos`, `mix` or `neg`: the prototype's sentiment colours. */
  tone?: string | undefined;
}

// Port of concept-04b's `.opt-row` of `button.opt[aria-pressed]` (renderCompose). The hidden input
// carries the choice to the server action, since the buttons themselves submit nothing.
export function OptionGroup({
  name,
  label,
  options,
  value,
  onChange,
  required = false,
  clearable = false,
  error,
}: {
  name: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Pressing the chosen option again clears it (optional questions). */
  clearable?: boolean;
  /** An i18n message key. */
  error?: string | undefined;
}) {
  const t = useTranslations();
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <span className="lbl" id={labelId}>
        {label}
        {required ? <span className="req">{t('compose.required')}</span> : null}
      </span>
      <div
        className="opt-row"
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        data-invalid={error ? 'true' : undefined}
        data-testid={`compose-${name}-options`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            className={option.tone ? `opt ${option.tone}` : 'opt'}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(clearable && value === option.value ? '' : option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
      {error ? (
        <p className="field-error" id={errorId}>
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}
