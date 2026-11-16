import { useFormatter, useTranslations } from 'next-intl';
import type { QueueItem } from '@/lib/data/review';
import { Link } from '@/lib/i18n/navigation';

interface QueueListProps {
  items: QueueItem[];
  currentUserId: string;
}

export function QueueList({ items, currentUserId }: QueueListProps) {
  const t = useTranslations('review');
  const format = useFormatter();

  if (items.length === 0) return <p className="work-list__empty">{t('empty')}</p>;

  return (
    <ul className="work-list">
      {items.map((item) => (
        <li key={item.id} className="work-item">
          <div className="work-item__main">
            <h3 className="work-item__title">
              <Link href={`/review/${item.id}`} className="work-item__link" dir="auto">
                {item.title ?? t(`types.${item.targetType}`)}
              </Link>
            </h3>
            <p className="work-item__meta">
              {t('by', { name: item.submitterName ?? t('unknown') })}
              {' · '}
              {format.dateTime(new Date(item.submittedAt), { dateStyle: 'medium' })}
            </p>
            {item.claimedBy ? (
              <p className="work-item__meta">
                {item.claimedBy === currentUserId
                  ? t('heldByYou')
                  : t('heldBy', { name: item.claimedByName ?? t('unknown') })}
              </p>
            ) : null}
          </div>
          <span className="state-tag">{t(`types.${item.targetType}`)}</span>
        </li>
      ))}
    </ul>
  );
}
