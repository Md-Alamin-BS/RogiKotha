import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';

export function MiniList({ children }: { children: ReactNode }) {
  return <div className="mini-list">{children}</div>;
}

export function MiniRow({
  href,
  avatar,
  title,
  sub,
  loc,
}: {
  href: string;
  avatar: ReactNode;
  title: string;
  sub: string;
  loc?: string | undefined;
}) {
  return (
    <Link className="mini-row" href={href} data-testid="mini-row">
      <span className="mini-av">{avatar}</span>
      <span>
        <b>{title}</b>
        <span>{sub}</span>
        {loc ? <span>{loc}</span> : null}
      </span>
    </Link>
  );
}
