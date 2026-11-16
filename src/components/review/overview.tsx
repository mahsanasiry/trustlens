import { useFormatter, useTranslations } from 'next-intl';
import type { ReviewOverview } from '@/lib/data/review';

export function Overview({ overview }: { overview: ReviewOverview }) {
  const t = useTranslations('review.overview');
  const format = useFormatter();

  const stats = [
    { key: 'open', label: t('open'), value: format.number(overview.open) },
    { key: 'unclaimed', label: t('unclaimed'), value: format.number(overview.unclaimed) },
    { key: 'claimed', label: t('claimed'), value: format.number(overview.claimed) },
    {
      key: 'oldest',
      label: t('oldestDays'),
      value: overview.oldestDays === null ? '—' : format.number(overview.oldestDays),
    },
    {
      key: 'decided',
      label: t('decided'),
      value: format.number(overview.decidedLastWeek),
    },
  ];

  return (
    <dl className="review-stats" aria-label={t('label')}>
      {stats.map((stat) => (
        <div key={stat.key} className="review-stat">
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
