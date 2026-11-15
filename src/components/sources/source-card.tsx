import { useFormatter, useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/category-icon';
import { sourceTypeTone } from '@/lib/domain/source-tone';
import { Link } from '@/lib/i18n/navigation';
import type { SourceSummary } from '@/lib/data/sources';
import { CheckSummary } from './check-summary';

interface SourceCardProps {
  source: SourceSummary;
}

export function SourceCard({ source }: SourceCardProps) {
  const t = useTranslations('sources');
  const format = useFormatter();

  return (
    <article className="claim-card source-card">
      <div className="claim-card__head">
        <CategoryIcon kind="source" tone={sourceTypeTone[source.type]} />
        <div className="claim-card__meta">
          <span className="claim-card__category">{t(`type.${source.type}`)}</span>
          {source.published_on ? (
            <span>
              {t('card.published', {
                date: format.dateTime(new Date(source.published_on), {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
                }),
              })}
            </span>
          ) : null}
        </div>
      </div>
      <h2
        className="claim-card__title source-card__title"
        lang={source.language}
        dir="auto"
      >
        <Link href={`/sources/${source.id}`} className="claim-card__link">
          {source.title}
        </Link>
      </h2>
      <p className="source-card__publisher" lang={source.language} dir="auto">
        {source.publisher}
      </p>
      <CheckSummary assessments={source.source_assessments} />
      <label className="compare-pick">
        <input type="checkbox" name="ids" value={source.id} />
        <span aria-hidden="true">{t('compare.short')}</span>
        <span className="visually-hidden">
          {t('compare.pick', { title: source.title })}
        </span>
      </label>
    </article>
  );
}
