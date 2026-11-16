import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';

interface PaginationNavProps {
  pathname: string;
  page: number;
  pageCount: number;
  /** Filters to keep on every page link. */
  query?: Record<string, string>;
}

export function PaginationNav({
  pathname,
  page,
  pageCount,
  query: kept,
}: PaginationNavProps) {
  const t = useTranslations('claims.pagination');
  const format = useFormatter();
  if (pageCount <= 1) return null;

  const query = (target: number) => ({
    ...kept,
    ...(target > 1 ? { page: String(target) } : {}),
  });

  return (
    <nav aria-label={t('label')} className="pagination">
      {page > 1 ? (
        <Link
          href={{ pathname, query: query(page - 1) }}
          className="btn btn--quiet"
          rel="prev"
        >
          {t('previous')}
        </Link>
      ) : (
        <span />
      )}
      <span className="pagination__status" aria-current="page">
        {t('pageOf', { page: format.number(page), total: format.number(pageCount) })}
      </span>
      {page < pageCount ? (
        <Link
          href={{ pathname, query: query(page + 1) }}
          className="btn btn--quiet"
          rel="next"
        >
          {t('next')}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
