import { useTranslations } from 'next-intl';

export function SkipLink() {
  const t = useTranslations();
  return (
    <a className="skip" href="#main">
      {t('a11y.skip')}
    </a>
  );
}
