import { useTranslations } from 'next-intl';
import type { ClaimStatus } from '@/lib/domain/enums';

interface StatusBadgeProps {
  status: ClaimStatus;
}

// Deliberately neutral: a status describes the state of the evidence, so no
// status gets a "good" or "bad" colour.
export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('claims.status');
  return <span className={`status status--${status}`}>{t(status)}</span>;
}
