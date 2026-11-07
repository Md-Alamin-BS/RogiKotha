import { useTranslations } from 'next-intl';

export type PolicyKind = 'terms' | 'privacy';

interface PolicySection {
  key: string;
  titleKey: string;
  bodyKey: string;
}

// FD-008, FD-022 and FD-109: the lawful-access section is the last section of both legal pages,
// /terms and /privacy, and appears nowhere else (tested by the FD-022 placement test).
const LAWFUL_SECTION: PolicySection = {
  key: 'lawful',
  titleKey: 'policy.privacy.lawful',
  bodyKey: 'policy.privacy.lawfulBody',
};

// Task step 3: "Terms sections reuse existing bodies" (what the service is
// not, labels are the author's claim, moderation), then the two new
// Terms-only sections, in this order, then the lawful-access section (FD-109).
const TERMS_SECTIONS: PolicySection[] = [
  { key: 'limits', titleKey: 'aboutview.limitsTitle', bodyKey: 'aboutview.limitsBody' },
  { key: 'reviewer', titleKey: 'aboutview.reviewerTitle', bodyKey: 'aboutview.reviewerBody' },
  { key: 'moderation', titleKey: 'aboutview.modTitle', bodyKey: 'aboutview.modBody' },
  {
    key: 'eligibility',
    titleKey: 'policy.terms.eligibility',
    bodyKey: 'policy.terms.eligibilityBody',
  },
  {
    key: 'enforcement',
    titleKey: 'policy.terms.enforcement',
    bodyKey: 'policy.terms.enforcementBody',
  },
  LAWFUL_SECTION,
];

// Task step 3 + FD-022: identity choices/redaction (reused from About), what
// we keep, then the lawful-access sentence as its OWN section, as on /terms (FD-109).
const PRIVACY_SECTIONS: PolicySection[] = [
  { key: 'identity', titleKey: 'aboutview.privacyTitle', bodyKey: 'aboutview.privacyBody' },
  { key: 'data', titleKey: 'policy.privacy.data', bodyKey: 'policy.privacy.dataBody' },
  LAWFUL_SECTION,
];

// Port of the same "panel head + about-sections" shell as About
// (concept-04b has no Terms/Privacy screens of its own — 03-routes-and-
// contracts.md §1 adds both routes for the registration form's links).
export function Policy({ kind }: { kind: PolicyKind }) {
  const t = useTranslations();
  const sections = kind === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const titleKey = kind === 'terms' ? 'policy.terms.title' : 'policy.privacy.title';
  const introKey = kind === 'terms' ? 'policy.terms.intro' : 'policy.privacy.intro';

  return (
    <>
      <section className="panel about-head">
        {/* ASSUMPTION(T-207a): task step 3 says "same shell as About" but
            names no dedicated kicker key for Terms/Privacy. Reusing
            nav.about, same source as About's own kicker, since both routes
            sit under the same "About" nav grouping (ISS-099). */}
        <span className="kicker">{t('nav.about')}</span>
        <h1>{t(titleKey)}</h1>
        <p className="lead">{t(introKey)}</p>
      </section>

      <div className="about-sections">
        {sections.map((section) => (
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
