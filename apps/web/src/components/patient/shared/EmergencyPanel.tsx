import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { formatDate, formatDigits } from '@rogikotha/i18n/format';
import type { EmergencyConfig } from '@/components/patient/Emergency';

// Port of concept-04b's emergencyPanel() (app.js 435-446). The numbers come from config, exactly as
// the /emergency page shows them; the panel is never animated or revealed (BR9.4, BR7.4).
export function EmergencyPanel({
  config,
  compact = false,
}: {
  config: EmergencyConfig;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const headingId = compact ? 'emergency-panel-compact-head' : 'emergency-panel-head';

  if (compact) {
    return (
      <section
        className="panel emergency-panel emergency-panel--compact"
        aria-labelledby={headingId}
        data-static="emergency"
        data-testid="emergency-panel"
      >
        <h2 id={headingId}>{t('emergency.title')}</h2>
        <p className="note">
          {t('emergency.compactLine', {
            ambulance: formatDigits(config.ambulance, locale),
            healthLine: formatDigits(config.healthLine, locale),
          })}
        </p>
      </section>
    );
  }

  const lines = [
    { key: 'ambulance', number: config.ambulance, label: t('emergency.ambulanceLabel') },
    { key: 'health', number: config.healthLine, label: t('emergency.healthLineLabel') },
    { key: 'crisis', number: config.crisisLine, label: t('emergency.crisis') },
  ];
  return (
    <section
      className="panel emergency-panel"
      aria-labelledby={headingId}
      data-static="emergency"
      data-testid="emergency-panel"
    >
      <h2 id={headingId}>{t('emergency.title')}</h2>
      <p className="lede">{t('emergency.body')}</p>
      <div className="emergency-lines">
        {lines.map((line) => (
          <a key={line.key} href={`tel:${line.number}`}>
            <b>{formatDigits(line.number, locale)}</b>
            <span>{line.label}</span>
          </a>
        ))}
      </div>
      <p className="note">
        {t('emergency.lastVerifiedLine', { date: formatDate(config.lastVerified, locale) })}
      </p>
    </section>
  );
}
