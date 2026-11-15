import { useFormatter, useTranslations } from 'next-intl';
import { assessmentCriteria, criterionStatuses } from '@/lib/domain/enums';
import {
  assessmentByCriterion,
  countStatuses,
  type Assessment,
} from '@/lib/data/assessments';
import { CheckMark } from './check-mark';

interface CheckSummaryProps {
  assessments: readonly Assessment[];
}

export function CheckSummary({ assessments }: CheckSummaryProps) {
  const t = useTranslations('sources.criterionStatus');
  const tSources = useTranslations('sources.detail');
  const format = useFormatter();
  const byCriterion = assessmentByCriterion(assessments);
  const counts = countStatuses(assessments);

  return (
    <div className="check-summary">
      <p className="check-summary__title">{tSources('checks')}</p>
      <div className="check-strip" aria-hidden="true">
        {assessmentCriteria.map((criterion) => (
          <CheckMark
            key={criterion}
            status={byCriterion.get(criterion)?.status ?? 'none'}
          />
        ))}
      </div>
      <ul className="check-summary__legend">
        {criterionStatuses.map((status) => (
          <li key={status}>
            <CheckMark status={status} />
            <span>{t(status)}</span>
            <strong>{format.number(counts[status])}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
