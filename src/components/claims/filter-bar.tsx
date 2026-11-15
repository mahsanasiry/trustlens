import { useTranslations } from 'next-intl';
import { claimCategories, claimStatuses } from '@/lib/domain/enums';
import type { ClaimFilters } from '@/lib/data/claim-params';
import { Link } from '@/lib/i18n/navigation';

interface FilterBarProps {
  action: string;
  filters: ClaimFilters;
}

// A plain GET form: filtering works without scripts and the result is a
// shareable URL.
export function FilterBar({ action, filters }: FilterBarProps) {
  const t = useTranslations('claims');
  const active = filters.category !== undefined || filters.status !== undefined;

  return (
    <form method="get" action={action} className="filter-bar">
      <div className="field">
        <label htmlFor="filter-category">{t('filters.category')}</label>
        <select
          id="filter-category"
          name="category"
          defaultValue={filters.category ?? ''}
        >
          <option value="">{t('filters.all')}</option>
          {claimCategories.map((value) => (
            <option key={value} value={value}>
              {t(`category.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-status">{t('filters.status')}</label>
        <select id="filter-status" name="status" defaultValue={filters.status ?? ''}>
          <option value="">{t('filters.all')}</option>
          {claimStatuses.map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-bar__actions">
        <button type="submit" className="btn btn--primary">
          {t('filters.apply')}
        </button>
        {active ? (
          <Link href="/claims" className="btn btn--quiet">
            {t('filters.reset')}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
