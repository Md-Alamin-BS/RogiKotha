import { useTranslations } from 'next-intl';

// Port of concept-04b's notVerified() (app.js 370-372). Every doctor carries it until BMDC
// verification exists (PRODUCT.md hard rule).
export function NotVerifiedBadge() {
  const t = useTranslations();
  return (
    <span className="badge warn" title={t('label.notVerifiedWhy')} data-testid="not-verified">
      {t('label.notVerified')}
    </span>
  );
}
