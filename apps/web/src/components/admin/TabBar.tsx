import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Icon } from '../shared/Icon';
import { NAV_GROUPS, type NavCounts } from './ConsoleNav';
import type { AdminTab } from '@/lib/cookies';

// Port of admin/app.js's renderTabBar() (lines ~265-279): under 760px the
// top nav becomes this bottom tab bar, in the same grouped order.
export function TabBar({ active, counts }: { active?: AdminTab | undefined; counts: NavCounts }) {
  const t = useTranslations();
  const items = NAV_GROUPS.flatMap((group) => group.items);
  return (
    <nav className="tabbar" aria-label={t('a11y.screens')}>
      {items.map((item) => {
        const count = counts[item.id];
        const urgent = item.id === 'queue' && counts.critical > 0;
        const label = t(item.key).split(' ')[0];
        return (
          <Link
            key={item.id}
            href={item.href}
            className="tab-item"
            data-admin={item.id}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            {count ? <span className={`tab-dot${urgent ? ' urgent' : ''}`}>{count}</span> : null}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
