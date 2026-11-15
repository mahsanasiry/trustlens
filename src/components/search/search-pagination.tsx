import { useFormatter, useTranslations } from 'next-intl';
import type { SearchFilters } from '@/lib/data/search-params';
import { Link } from '@/lib/i18n/navigation';

interface SearchPaginationProps {
  filters: SearchFilters;
  pageCount: number;
}

function query(filters: SearchFilters, page: number) {
  return {
    q: filters.q,
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  };
}

export function SearchPagination({ filters, pageCount }: SearchPaginationProps) {
  const t = useTranslations('claims.pagination');
  const format = useFormatter();
  if (pageCount <= 1) return null;

  const { page } = filters;
  return (
    <nav aria-label={t('label')} className="pagination">
      {page > 1 ? (
        <Link
          href={{ pathname: '/search', query: query(filters, page - 1) }}
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
          href={{ pathname: '/search', query: query(filters, page + 1) }}
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
