import { useTranslations } from 'next-intl';

// A doctor a member added from the write form, until staff decide the submission (FD-100, BR2.13).
// The badge sits among the flags; `withWhy` renders the explaining note that follows the flags.
export function MemberAdded({ withWhy = false }: { withWhy?: boolean }) {
  const t = useTranslations();
  if (withWhy) {
    return (
      <p className="note" data-testid="member-added-note">
        {t('label.memberAddedWhy')}
      </p>
    );
  }
  return (
    <span className="badge plain" title={t('label.memberAddedWhy')} data-testid="member-added">
      {t('label.memberAdded')}
    </span>
  );
}
