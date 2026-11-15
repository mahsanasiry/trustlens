import { useTranslations } from 'next-intl';
import { searchKinds, type SearchFilters } from '@/lib/data/search-params';

interface SearchFormProps {
  action: string;
  filters: SearchFilters;
}

// A plain GET form, so searching works without scripts and every search has a
// shareable URL.
export function SearchForm({ action, filters }: SearchFormProps) {
  const t = useTranslations('search');

  return (
    <form method="get" action={action} role="search" className="search-form">
      <div className="field search-form__query">
        <label htmlFor="search-q">{t('label')}</label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder={t('placeholder')}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      <div className="field search-form__kind">
        <label htmlFor="search-kind">{t('kind.label')}</label>
        <select id="search-kind" name="kind" defaultValue={filters.kind ?? ''}>
          <option value="">{t('kind.all')}</option>
          {searchKinds.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kind.${kind}`)}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn--primary">
        {t('submit')}
      </button>
    </form>
  );
}
