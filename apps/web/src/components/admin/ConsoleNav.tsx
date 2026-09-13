import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Icon, type IconName } from '../shared/Icon';
import type { AdminTab } from '@/lib/cookies';

export type { AdminTab };

export interface NavCounts {
  queue: number;
  critical: number;
  evidence: number;
  providers: number;
  notifications: number;
  config: number;
}

export const ZERO_NAV_COUNTS: NavCounts = {
  queue: 0,
  critical: 0,
  evidence: 0,
  providers: 0,
  notifications: 0,
  config: 0,
};

interface NavItem {
  id: AdminTab;
  icon: IconName;
  key: string;
  href: '/admin/queue' | '/admin/evidence' | '/admin/providers' | '/admin/notifications' | '/admin/config';
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

// Port of admin/app.js's NAV_GROUPS (lines ~186-195); adminNavCounts (feeds
// `counts`) is T-406's job (03-routes-and-contracts.md §4 administration) —
// every count is 0 here.
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'admin.nav.casework',
    items: [
      { id: 'queue', icon: 'inbox', key: 'admin.tab.queue', href: '/admin/queue' },
      { id: 'evidence', icon: 'shield', key: 'admin.tab.evidence', href: '/admin/evidence' },
      { id: 'providers', icon: 'idcard', key: 'admin.tab.providers', href: '/admin/providers' },
    ],
  },
  {
    labelKey: 'admin.nav.oversight',
    items: [
      { id: 'notifications', icon: 'bell', key: 'admin.tab.notifications', href: '/admin/notifications' },
      { id: 'config', icon: 'sliders', key: 'admin.tab.config', href: '/admin/config' },
    ],
  },
];

export function navGroupLabelKey(tab?: AdminTab): string {
  for (const group of NAV_GROUPS) {
    if (group.items.some((item) => item.id === tab)) return group.labelKey;
  }
  return 'admin.nav.casework';
}

export function navItemKey(tab?: AdminTab): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === tab) return item.key;
    }
  }
  return 'admin.tab.queue';
}

type NavEntry = { type: 'sep'; key: string } | { type: 'item'; item: NavItem };

function flatEntries(): NavEntry[] {
  return NAV_GROUPS.flatMap((group, gi) => [
    ...(gi > 0 ? [{ type: 'sep', key: `sep-${gi}` } as NavEntry] : []),
    ...group.items.map((item): NavEntry => ({ type: 'item', item })),
  ]);
}

export function ConsoleNav({ active, counts }: { active?: AdminTab | undefined; counts: NavCounts }) {
  const t = useTranslations();
  return (
    <nav className="bar-nav" aria-label={t('a11y.screens')}>
      {flatEntries().map((entry) => {
        if (entry.type === 'sep') {
          return <span key={entry.key} className="nav-sep" aria-hidden="true" />;
        }
        const { item } = entry;
        const count = counts[item.id];
        const urgent = item.id === 'queue' && counts.critical > 0;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="top-item"
            data-admin={item.id}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            <span>{t(item.key)}</span>
            {count ? <span className={`count${urgent ? ' urgent' : ''}`}>{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
