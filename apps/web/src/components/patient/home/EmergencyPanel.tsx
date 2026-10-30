import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { formatDate, formatDigits } from '@rogikotha/i18n/format';
import type { EmergencyConfig } from '@/components/patient/Emergency';

// Port of concept-04b's emergencyPanel() (app.js 435-446), shown on the home page. The numbers come
// from config, exactly as the /emergency page shows them.
export function EmergencyPanel({ config }: { config: EmergencyConfig }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const lines = [
    { key: 'ambulance', number: config.ambulance, label: t('emergency.ambulanceLabel') },
    { key: 'health', number: config.healthLine, label: t('emergency.healthLineLabel') },
    { key: 'crisis', number: config.crisisLine, label: t('emergency.crisis') },
  ];

  return (
    <section
      className="panel"
      style={{ borderColor: 'var(--danger-line)' }}
      aria-labelledby="home-emergency-head"
      data-testid="home-emergency"
    >
      <h2 id="home-emergency-head" style={{ fontSize: '18px', color: 'var(--danger-ink)' }}>
        {t('emergency.title')}
      </h2>
      <p className="lede" style={{ fontSize: '15px' }}>
        {t('emergency.body')}
      </p>
      <div className="emergency-lines">
        {lines.map((line) => (
          <a key={line.key} href={`tel:${line.number}`} data-testid={`home-emergency-${line.key}`}>
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
