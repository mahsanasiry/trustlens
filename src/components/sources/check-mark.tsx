import { useTranslations } from 'next-intl';
import type { CriterionStatus } from '@/lib/domain/enums';

interface CheckMarkProps {
  status: CriterionStatus | 'none';
}

// Status is carried by shape as well as by text: solid, half, empty and
// dashed squares. It uses no colour coding, since a check is not a verdict.
export function CheckMark({ status }: CheckMarkProps) {
  return <span className={`check check--${status}`} aria-hidden="true" />;
}

interface CheckLabelProps {
  status: CriterionStatus;
}

export function CheckLabel({ status }: CheckLabelProps) {
  const t = useTranslations('sources.criterionStatus');
  return (
    <span className="check-label">
      <CheckMark status={status} />
      {t(status)}
    </span>
  );
}
