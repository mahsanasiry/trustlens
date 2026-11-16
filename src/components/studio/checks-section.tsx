import { useTranslations } from 'next-intl';
import { StateTag } from '@/components/studio/state-tag';
import type { AssessmentRecord } from '@/lib/data/authoring';
import { assessmentCriteria } from '@/lib/domain/enums';
import { Link } from '@/lib/i18n/navigation';

interface ChecksSectionProps {
  sourceId: string;
  checks: AssessmentRecord[];
}

export function ChecksSection({ sourceId, checks }: ChecksSectionProps) {
  const t = useTranslations('authoring.checks');
  const tCriteria = useTranslations('sources.criteria');
  const tStatus = useTranslations('sources.criterionStatus');

  return (
    <section aria-labelledby="studio-checks" className="card studio-section">
      <header className="studio-section__header">
        <h2 id="studio-checks">{t('section')}</h2>
      </header>
      <p className="studio-section__lead">{t('lead')}</p>

      <ul className="work-list">
        {assessmentCriteria.map((criterion) => {
          const check = checks.find((item) => item.criterion === criterion);
          return (
            <li key={criterion} className="work-item">
              <div className="work-item__main">
                <h3 className="work-item__title">
                  <Link
                    href={`/studio/sources/${sourceId}/checks/${criterion}`}
                    className="work-item__link"
                  >
                    {tCriteria(criterion)}
                  </Link>
                </h3>
                <p className="work-item__meta">
                  {check ? tStatus(check.status) : t('notYet')}
                </p>
              </div>
              {check ? <StateTag state={check.state} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
