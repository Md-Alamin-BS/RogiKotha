import { useTranslations } from 'next-intl';

// A doctor a member added from the write form, until staff decide the submission (FD-100).
export function MemberAddedBadge() {
  const t = useTranslations();
  return (
    <span className="badge warn" title={t('label.memberAddedWhy')} data-testid="member-added">
      {t('label.memberAdded')}
    </span>
  );
}
