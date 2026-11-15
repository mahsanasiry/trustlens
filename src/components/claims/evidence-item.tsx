import { useFormatter, useTranslations } from 'next-intl';
import type { EvidenceItem as EvidenceItemData } from '@/lib/data/claims';
import { safeHttpUrl } from '@/lib/safe-url';

interface EvidenceItemProps {
  item: EvidenceItemData;
}

export function EvidenceItem({ item }: EvidenceItemProps) {
  const t = useTranslations('claims.detail');
  const tEvidence = useTranslations('evidence');
  const format = useFormatter();
  const { sources: source } = item;
  const href = source ? safeHttpUrl(source.url) : null;

  return (
    <li className={`evidence-item pos-${item.position}`}>
      <h4 className="evidence-item__title">
        <span className={`marker marker--${item.position}`} aria-hidden="true" />
        <span className="visually-hidden">
          {tEvidence(`positions.${item.position}`)}:{' '}
        </span>
        <span lang={source?.language} dir="auto">
          {item.title}
        </span>
      </h4>
      <p className="evidence-item__summary" lang={source?.language} dir="auto">
        {item.summary}
      </p>
      {source ? (
        <p className="evidence-item__source" lang={source.language} dir="auto">
          {href ? (
            <a href={href} rel="noopener noreferrer" target="_blank">
              {source.title}
            </a>
          ) : (
            source.title
          )}
          <span className="evidence-item__publisher">
            {source.publisher}
            {source.published_on
              ? `, ${format.dateTime(new Date(source.published_on), { dateStyle: 'medium', timeZone: 'UTC' })}`
              : ''}
          </span>
        </p>
      ) : null}
      {item.limitations ? (
        <div className="evidence-item__note">
          <h5>{t('limitations')}</h5>
          <p lang={source?.language} dir="auto">
            {item.limitations}
          </p>
        </div>
      ) : null}
      {item.researcher_note ? (
        <div className="evidence-item__note">
          <h5>{t('researcherNote')}</h5>
          <p lang={source?.language} dir="auto">
            {item.researcher_note}
          </p>
        </div>
      ) : null}
    </li>
  );
}
