import { useTranslations } from 'next-intl';

// Port of concept-04b's notVerified() (app.js 370-372). Every doctor and every facility carries it
// until registration checks exist (BR2.5, PRODUCT.md hard rule).
export function NotVerified({
  kind,
  describedById,
}: {
  kind: 'doctor' | 'facility';
  describedById?: string | undefined;
}) {
  const t = useTranslations();
  const label = kind === 'doctor' ? t('label.notVerified') : t('facility.notVerified');
  const why = kind === 'doctor' ? t('label.notVerifiedWhy') : t('facility.notVerifiedWhy');
  return (
    <>
      <span
        className="badge warn"
        title={why}
        aria-describedby={describedById}
        data-testid="not-verified"
      >
        {label}
      </span>
      {describedById ? (
        <span id={describedById} className="sr-only">
          {why}
        </span>
      ) : null}
    </>
  );
}
