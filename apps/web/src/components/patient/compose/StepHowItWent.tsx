'use client';

import { type Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import {
  CRITERIA,
  CRITERION_VALUES,
  OUTCOMES,
  REVIEWER_LABEL_CODES,
  SENTIMENTS,
  type CriterionValue,
  type DraftPayload,
  type Outcome,
  type Sentiment,
} from '@rogikotha/contracts';

import type { ComposerAction } from './composer-reducer';
import { OptionGroup } from './OptionGroup';

const SENTIMENT_TONE: Record<Sentiment, string> = {
  positive: 'pos',
  mixed: 'mix',
  negative: 'neg',
};
const CRITERION_TONE: Record<CriterionValue, string> = { good: 'pos', mixed: 'mix', poor: 'neg' };

const SENTIMENT_SET: ReadonlySet<string> = new Set(SENTIMENTS);
const OUTCOME_SET: ReadonlySet<string> = new Set(OUTCOMES);
const CRITERION_VALUE_SET: ReadonlySet<string> = new Set(CRITERION_VALUES);

// Step 3, "How it went" (BR3.8, BR8.10). A doctor account: sentiment, outcome and up to three
// Reviewer's labels, all optional. A facility account: nine optional choices. Nothing here is a
// score; pressing a chosen value again clears it.
export function StepHowItWent({
  payload,
  dispatch,
}: {
  payload: DraftPayload;
  dispatch: Dispatch<ComposerAction>;
}) {
  const t = useTranslations();

  if (payload.target === 'facility') {
    return (
      <div className="step-how" data-testid="compose-step-how">
        {CRITERIA.map((criterion) => (
          <div key={criterion}>
            <OptionGroup
              name={`crit-${criterion}`}
              label={`${t(`crit.${criterion}`)} — ${t('compose.optional')}`}
              options={CRITERION_VALUES.map((value) => ({
                value,
                label: t(`crit.${value}`),
                tone: CRITERION_TONE[value],
              }))}
              value={payload.criteria?.[criterion] ?? ''}
              onChange={(value) => {
                if (CRITERION_VALUE_SET.has(value)) {
                  dispatch({ type: 'criterion', criterion, value: value as CriterionValue });
                }
              }}
            />
            {criterion === 'reportTrust' ? (
              <p className="sub" data-testid="compose-report-trust-note">
                {t('crit.reportTrustNote')}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="step-how" data-testid="compose-step-how">
      <OptionGroup
        name="sentiment"
        label={`${t('compose.sentiment')} — ${t('compose.optional')}`}
        options={SENTIMENTS.map((s) => ({
          value: s,
          label: t(`sentiment.${s}`),
          tone: SENTIMENT_TONE[s],
        }))}
        value={payload.sentiment ?? ''}
        onChange={(value) => {
          if (SENTIMENT_SET.has(value)) {
            dispatch({ type: 'sentiment', sentiment: value as Sentiment });
          }
        }}
      />
      <OptionGroup
        name="outcome"
        label={`${t('compose.outcome')} — ${t('compose.optional')}`}
        options={OUTCOMES.map((o) => ({ value: o, label: t(`outcome.${o}`) }))}
        value={payload.outcome ?? ''}
        onChange={(value) => {
          if (OUTCOME_SET.has(value)) dispatch({ type: 'outcome', outcome: value as Outcome });
        }}
      />
      <fieldset className="field" data-testid="compose-claims">
        <legend className="lbl">
          {t('compose.claims')}
          <span className="req optional">{t('compose.optional')}</span>
        </legend>
        <p className="sub">{t('compose.claimsNote')}</p>
        <div className="opt-row">
          {REVIEWER_LABEL_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className="opt"
              aria-pressed={payload.claims.includes(code)}
              onClick={() => dispatch({ type: 'claim', claim: code })}
            >
              {t(`claim.${code}`)}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
