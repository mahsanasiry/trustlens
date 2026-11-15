import { useFormatter, useTranslations } from 'next-intl';
import type { ClaimFilters } from '@/lib/data/claim-params';
import { Link } from '@/lib/i18n/navigation';

interface PaginationProps {
  filters: ClaimFilters;
  pageCount: number;
}

function query(filters: ClaimFilters, page: number) {
  return {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  };
}

export function Pagination({ filters, pageCount }: PaginationProps) {
  const t = useTranslations('claims.pagination');
  const format = useFormatter();
  if (pageCount <= 1) return null;

  const { page } = filters;
  return (
    <nav aria-label={t('label')} className="pagination">
      {page > 1 ? (
        <Link
          href={{ pathname: '/claims', query: query(filters, page - 1) }}
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
          href={{ pathname: '/claims', query: query(filters, page + 1) }}
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
