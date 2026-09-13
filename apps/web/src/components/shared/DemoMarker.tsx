import { useTranslations } from 'next-intl';

// ASSUMPTION(T-008): the admin prototype appends a second
// `· <span data-i18n="admin.demoNote">` segment after the shared
// `demo.banner` text (ui-design-prototype/admin/index.html line 29), but
// `admin.demoNote` was never ported to packages/i18n/messages/*.json and
// this task's only allowed cross-package i18n edit is `shell.placeholder`
// (already present from T-006) — see ISS list in the T-008 hand-off. Both
// layouts render the shared `demo.banner` text only.
export function DemoMarker() {
  const t = useTranslations();
  return (
    <p className="demo" role="note">
      <span>{t('demo.banner')}</span>
    </p>
  );
}
