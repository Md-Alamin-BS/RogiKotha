import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

// Keyset paging of the experience lists (BR7.1): plain links, so it works without script.
export function Pager({
  nextCursor,
  isLaterPage,
  basePath,
}: {
  nextCursor?: string | undefined;
  isLaterPage: boolean;
  basePath: string;
}) {
  const t = useTranslations();
  if (!nextCursor && !isLaterPage) return null;
  return (
    <p className="pager" data-testid="pager">
      {nextCursor ? (
        <Link
          className="btn small ghost"
          href={{ pathname: basePath, query: { cursor: nextCursor } }}
          data-testid="pager-more"
        >
          {t('index.more')}
        </Link>
      ) : null}
      {isLaterPage ? (
        <Link className="link-btn" href={basePath} data-testid="pager-newest">
          {t('index.newest')}
        </Link>
      ) : null}
    </p>
  );
}
