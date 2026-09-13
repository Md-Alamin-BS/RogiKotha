import { useTranslations } from 'next-intl';

interface AboutSection {
  key: string;
  titleKey: string;
  bodyKey: string;
}

const ABOUT_SECTIONS: AboutSection[] = [
  { key: 'moderation', titleKey: 'aboutview.modTitle', bodyKey: 'aboutview.modBody' },
  { key: 'reviewer', titleKey: 'aboutview.reviewerTitle', bodyKey: 'aboutview.reviewerBody' },
  { key: 'privacy', titleKey: 'aboutview.privacyTitle', bodyKey: 'aboutview.privacyBody' },
  { key: 'limits', titleKey: 'aboutview.limitsTitle', bodyKey: 'aboutview.limitsBody' },
  // Task step 2: the prototype's contact body ("design exploration — not
  // monitored") is replaced by `aboutview.contactBodyProduct` — the demo
  // marker already says the records are fictional, so that clause is
  // dropped here instead.
  { key: 'contact', titleKey: 'aboutview.contact', bodyKey: 'aboutview.contactBodyProduct' },
];

// Port of concept-04b's renderAbout() (app.js lines 2067-2095). The panel's
// own `<h1>`/kicker replace ViewShell's generic `.display` heading (see
// ViewShell.tsx's T-207a note) so this is a single-heading page, same as
// the prototype.
export function About() {
  const t = useTranslations();

  return (
    <>
      <section className="panel about-head">
        <span className="kicker">{t('nav.about')}</span>
        <h1>{t('aboutview.title')}</h1>
        <p className="lead">{t('aboutview.intro')}</p>
      </section>

      <div className="about-sections">
        {ABOUT_SECTIONS.map((section) => (
          <section key={section.key} className="panel about-section">
            <h2>{t(section.titleKey)}</h2>
            <p>{t(section.bodyKey)}</p>
          </section>
        ))}
      </div>

      <p className="note about-foot">{t('aboutview.lastReviewed')}</p>
    </>
  );
}
