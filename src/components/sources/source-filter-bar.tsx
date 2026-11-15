import { useTranslations } from 'next-intl';
import { sourceTypes } from '@/lib/domain/enums';
import type { SourceFilters } from '@/lib/data/source-params';
import { Link } from '@/lib/i18n/navigation';

interface SourceFilterBarProps {
  action: string;
  filters: SourceFilters;
}

export function SourceFilterBar({ action, filters }: SourceFilterBarProps) {
  const t = useTranslations('sources');
  const tClaims = useTranslations('claims.filters');

  return (
    <form method="get" action={action} className="filter-bar">
      <div className="field">
        <label htmlFor="filter-type">{t('filters.type')}</label>
        <select id="filter-type" name="type" defaultValue={filters.type ?? ''}>
          <option value="">{tClaims('all')}</option>
          {sourceTypes.map((value) => (
            <option key={value} value={value}>
              {t(`type.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-bar__actions">
        <button type="submit" className="btn btn--primary">
          {tClaims('apply')}
        </button>
        {filters.type ? (
          <Link href="/sources" className="btn btn--quiet">
            {tClaims('reset')}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
