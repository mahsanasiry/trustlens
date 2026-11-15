import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/claims/status-badge';
import { CategoryIcon } from '@/components/category-icon';
import { sourceTypeTone } from '@/lib/domain/source-tone';
import type { ResultItem } from '@/lib/data/result-item';
import { Link } from '@/lib/i18n/navigation';

interface SearchResultCardProps {
  result: ResultItem;
  /** A control shown at the end of the row, such as a remove button. */
  action?: ReactNode;
}

export function SearchResultCard({ result, action }: SearchResultCardProps) {
  const t = useTranslations('search.result');
  const tClaims = useTranslations('claims.category');
  const tSources = useTranslations('sources.type');
  const isClaim = result.kind === 'claim';

  return (
    <li className="search-result">
      {isClaim ? (
        <CategoryIcon kind={result.category} />
      ) : (
        <CategoryIcon kind="source" tone={sourceTypeTone[result.source_type]} />
      )}
      <div className="search-result__body">
        <p className="search-result__meta">
          <span className="search-result__kind">{t(result.kind)}</span>
          <span>{isClaim ? tClaims(result.category) : tSources(result.source_type)}</span>
        </p>
        <h2 className="search-result__title">
          <Link
            href={isClaim ? `/claims/${result.id}` : `/sources/${result.id}`}
            className="claim-card__link"
            lang={result.language}
            dir="auto"
          >
            {result.title}
          </Link>
        </h2>
        {isClaim ? (
          <StatusBadge status={result.status} />
        ) : (
          <p className="search-result__publisher" lang={result.language} dir="auto">
            {result.publisher}
          </p>
        )}
      </div>
      {action ? <div className="search-result__action">{action}</div> : null}
    </li>
  );
}
