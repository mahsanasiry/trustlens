import { useFormatter, useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/category-icon';
import type { CollectionSummary } from '@/lib/data/collections';
import { Link } from '@/lib/i18n/navigation';

interface CollectionCardProps {
  collection: CollectionSummary;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const t = useTranslations('collections');
  const format = useFormatter();

  return (
    <li className="collection-card">
      <div className="collection-card__head">
        <CategoryIcon kind="folder" />
        <h2 className="collection-card__title">
          <Link
            href={`/collections/${collection.id}`}
            className="claim-card__link"
            dir="auto"
          >
            {collection.title}
          </Link>
        </h2>
      </div>
      {collection.description ? (
        <p className="collection-card__description" dir="auto">
          {collection.description}
        </p>
      ) : null}
      <p className="collection-card__meta">
        <span className="tag">
          {t(
            collection.visibility === 'private'
              ? 'visibility.private'
              : 'visibility.unlisted',
          )}
        </span>
        <span>{t('itemCount', { count: format.number(collection.itemCount) })}</span>
      </p>
    </li>
  );
}
