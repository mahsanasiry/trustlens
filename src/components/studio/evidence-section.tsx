import { useFormatter, useTranslations } from 'next-intl';
import { StateTag } from '@/components/studio/state-tag';
import type { WorkItem } from '@/lib/data/studio';
import { Link } from '@/lib/i18n/navigation';

interface EvidenceSectionProps {
  claimId: string;
  items: WorkItem[];
}

export function EvidenceSection({ claimId, items }: EvidenceSectionProps) {
  const t = useTranslations('authoring.evidence');
  const tStudio = useTranslations('studio');
  const format = useFormatter();

  return (
    <section aria-labelledby="studio-evidence" className="card studio-section">
      <header className="studio-section__header">
        <h2 id="studio-evidence">{t('section')}</h2>
        <Link
          href={`/studio/claims/${claimId}/evidence/new`}
          className="btn btn--primary"
        >
          {t('add')}
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="work-list__empty">{t('empty')}</p>
      ) : (
        <ul className="work-list">
          {items.map((item) => (
            <li key={item.id} className="work-item">
              <div className="work-item__main">
                <h3 className="work-item__title">
                  <Link
                    href={`/studio/evidence/${item.id}`}
                    className="work-item__link"
                    dir="auto"
                  >
                    {item.title}
                  </Link>
                </h3>
                <p className="work-item__meta">
                  {tStudio('updated', {
                    date: format.dateTime(new Date(item.updatedAt), {
                      dateStyle: 'medium',
                    }),
                  })}
                </p>
              </div>
              <StateTag state={item.state} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
