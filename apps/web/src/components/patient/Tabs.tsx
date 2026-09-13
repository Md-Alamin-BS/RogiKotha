import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { PatientTab } from '@/lib/cookies';

const TAB_ITEMS: { id: PatientTab; href: '/' | '/doctors' | '/facilities' | '/topics' | '/experiences' | '/me'; key: string }[] = [
  { id: 'discover', href: '/', key: 'nav.discover' },
  { id: 'doctors', href: '/doctors', key: 'nav.profile' },
  { id: 'facilities', href: '/facilities', key: 'nav.facilities' },
  { id: 'topics', href: '/topics', key: 'nav.condition' },
  { id: 'experiences', href: '/experiences', key: 'nav.account' },
  { id: 'mine', href: '/me', key: 'nav.mine' },
];

export function Tabs({ active }: { active?: PatientTab | undefined }) {
  const t = useTranslations();
  return (
    <nav className="tabs" aria-label={t('a11y.screens')}>
      {TAB_ITEMS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          data-nav={tab.id}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
