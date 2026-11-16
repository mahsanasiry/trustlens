import { useFormatter, useTranslations } from 'next-intl';
import { StateTag } from '@/components/studio/state-tag';
import type { WorkItem } from '@/lib/data/studio';
import { Link } from '@/lib/i18n/navigation';
import type { StudioKind } from '@/lib/data/studio-params';

interface WorkListProps {
  kind: StudioKind;
  items: WorkItem[];
}

export function WorkList({ kind, items }: WorkListProps) {
  const t = useTranslations('studio');
  const format = useFormatter();

  if (items.length === 0) {
    return <p className="work-list__empty">{t(`empty.${kind}`)}</p>;
  }

  return (
    <ul className="work-list">
      {items.map((item) => (
        <li key={item.id} className="work-item">
          <div className="work-item__main">
            <h3 className="work-item__title">
              <Link
                href={`/studio/${kind === 'claim' ? 'claims' : 'sources'}/${item.id}`}
                className="work-item__link"
                dir="auto"
              >
                {item.title}
              </Link>
            </h3>
            <p className="work-item__meta">
              {t('updated', {
                date: format.dateTime(new Date(item.updatedAt), { dateStyle: 'medium' }),
              })}
            </p>
          </div>
          <StateTag state={item.state} />
        </li>
      ))}
    </ul>
  );
}
