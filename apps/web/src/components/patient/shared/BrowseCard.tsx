import { Link } from '@/i18n/routing';

export function BrowseCard({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link className="browse-card" href={href} data-testid="browse-card">
      <b>{title}</b>
      <span>{sub}</span>
    </Link>
  );
}
