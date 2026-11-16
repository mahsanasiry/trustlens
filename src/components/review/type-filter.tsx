import { useTranslations } from 'next-intl';
import { reviewTargets, type ReviewTarget } from '@/lib/domain/enums';
import { Link } from '@/lib/i18n/navigation';

interface TypeFilterProps {
  current: ReviewTarget | undefined;
}

// Plain links rather than a form: the filter is a place in the queue that can be
// bookmarked and shared between admins.
export function TypeFilter({ current }: TypeFilterProps) {
  const t = useTranslations('review');
  const tClaims = useTranslations('claims.filters');

  return (
    <nav aria-label={t('filterLabel')} className="review-filter">
      <Link
        href="/review"
        className="review-filter__link"
        aria-current={current === undefined ? 'page' : undefined}
      >
        {tClaims('all')}
      </Link>
      {reviewTargets.map((target) => (
        <Link
          key={target}
          href={{ pathname: '/review', query: { type: target } }}
          className="review-filter__link"
          aria-current={current === target ? 'page' : undefined}
        >
          {t(`types.${target}`)}
        </Link>
      ))}
    </nav>
  );
}
