'use client';

import { useTranslations } from 'next-intl';
import type { ConfigValues, SafetyCheckKind } from '@rogikotha/contracts';

import { safetyFindings } from './safety';

type Finding = SafetyCheckKind;

const TONE: Record<Finding, 'warn' | 'danger'> = { pii: 'warn', emerg: 'danger', dup: 'warn' };
const KEY: Record<Finding, string> = { pii: 'Pii', emerg: 'Emerg', dup: 'Dup' };

// The composer's automatic checks (BR8.4, FD-009): advisory findings that never block Publish. The
// block keeps its place in the page; with an emergency finding it is marked `data-static` so no
// moving content may cover it (BR8.11).
export function SafetyChecks({
  texts,
  numbers,
  duplicate,
  dismissed,
  onDismiss,
}: {
  texts: readonly string[];
  numbers: ConfigValues['emergency'];
  duplicate: boolean;
  dismissed: readonly SafetyCheckKind[];
  onDismiss: (kind: SafetyCheckKind) => void;
}) {
  const t = useTranslations();
  const found: Finding[] = safetyFindings(texts, numbers);
  if (duplicate) found.push('dup');
  const shown = found.filter((kind) => !dismissed.includes(kind));
  const emergency = shown.includes('emerg');

  return (
    <div
      className="field"
      data-testid="compose-safety"
      {...(emergency ? { 'data-static': 'emergency' } : {})}
    >
      <span className="lbl">{t('compose.safety')}</span>
      <p className="sub">{t('compose.safetyNote')}</p>
      <div className="safety">
        {shown.length === 0 ? (
          <div className="safety-item ok" data-testid="compose-safety-pass">
            <span className="mark" aria-hidden="true">
              ✓
            </span>
            <span>{t('compose.safetyPass')}</span>
          </div>
        ) : (
          shown.map((kind) => (
            <div
              key={kind}
              className={`safety-item ${TONE[kind]}`}
              data-testid={`compose-safety-${kind}`}
            >
              <span className="mark" aria-hidden="true">
                !
              </span>
              <div>
                <b>{t(`compose.safety${KEY[kind]}`)}</b>
                <span>{t(`compose.safety${KEY[kind]}Fix`)}</span>
                <div className="btn-row">
                  <button type="button" className="btn ghost small" onClick={() => onDismiss(kind)}>
                    {t('compose.ignore')}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
