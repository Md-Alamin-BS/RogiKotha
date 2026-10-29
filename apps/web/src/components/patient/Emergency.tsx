import { useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
// ASSUMPTION(T-207a): imported from the package's `./format` subpath (added
// by this task), not the main `@rogikotha/i18n` barrel — the barrel's
// `index.ts` also re-exports `routing.ts`, which calls next-intl's
// `createNavigation()` at module-load time and needs a real Next.js build
// to resolve `next/navigation` (see Masthead.test.tsx's ISS-053 comment). A
// component that only needs pure formatting, not routing, would otherwise
// drag that failure into every test that renders it. See ISSUES.md.
import { formatDate, formatDigits } from '@rogikotha/i18n/format';

export interface EmergencyConfig {
  ambulance: string;
  healthLine: string;
  crisisLine: string;
  /** Calendar date only, "YYYY-MM-DD" (ConfigValues.emergency.lastVerified). */
  lastVerified: string;
}

interface EmergencyRow {
  key: string;
  labelKey: string;
  number: string;
}

// Port of concept-04b's renderEmergency() (app.js lines 2021-2061). The
// panel's own `<h1>`/kicker replace ViewShell's generic `.display` heading
// (see ViewShell.tsx's T-207a note) so this is a single-heading page, same
// as the prototype.
export function Emergency({ config, locale }: { config: EmergencyConfig; locale: Locale }) {
  const t = useTranslations();

  const rows: EmergencyRow[] = [
    { key: 'ambulance', labelKey: 'emergview.ambulance', number: config.ambulance },
    { key: 'healthLine', labelKey: 'emergview.healthLine', number: config.healthLine },
    { key: 'crisis', labelKey: 'emergview.crisis', number: config.crisisLine },
  ];

  return (
    <>
      <section className="panel emerg-head">
        <span className="kicker">{t('nav.emergency')}</span>
        <h1>{t('emergency.title')}</h1>
        <p>{t('emergview.intro')}</p>
      </section>

      <div className="emerg-grid">
        {rows.map((row) => (
          <a key={row.key} className="panel emerg-card" href={`tel:${row.number}`}>
            <span className="k">{t(row.labelKey)}</span>
            {/* Task step 1: the number is typed literally per config (kept
                exactly as configured, hyphen included) but still routed
                through the digit formatter for Bengali display. */}
            <span className="num">{formatDigits(row.number, locale)}</span>
            <span className="cta">{t('a11y.call')}</span>
          </a>
        ))}
        {/* verify.bmdc.org.bd is the registration-lookup portal. The general
            site (www.bmdc.org.bd) does not let you check a number, and the
            copy here promises exactly that. Source: 03-research-report.md. */}
        <a
          className="panel emerg-card bmdc"
          href="https://verify.bmdc.org.bd/"
          target="_blank"
          rel="noopener"
        >
          <span className="k">{t('emergview.bmdc')}</span>
          <span className="num">BMDC</span>
          <span className="cta">{t('emergview.bmdcBody')}</span>
        </a>
      </div>

      <p className="note" style={{ marginTop: '18px' }}>
        {t('emergency.lastVerifiedLine', { date: formatDate(config.lastVerified, locale) })}
      </p>
    </>
  );
}
