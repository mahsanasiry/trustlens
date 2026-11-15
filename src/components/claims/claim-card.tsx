import { useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/category-icon';
import { Link } from '@/lib/i18n/navigation';
import type { ClaimSummary } from '@/lib/data/claims';
import { countPositions } from '@/lib/data/position-counts';
import { EvidenceBar } from './evidence-bar';
import { StatusBadge } from './status-badge';

interface ClaimCardProps {
  claim: ClaimSummary;
}

export function ClaimCard({ claim }: ClaimCardProps) {
  const t = useTranslations('claims');

  return (
    <article className="claim-card">
      <div className="claim-card__head">
        <CategoryIcon kind={claim.category} />
        <div className="claim-card__meta">
          <span className="claim-card__category">{t(`category.${claim.category}`)}</span>
          <StatusBadge status={claim.status} />
        </div>
      </div>
      <h2 className="claim-card__title" lang={claim.language} dir="auto">
        <Link href={`/claims/${claim.id}`} className="claim-card__link">
          {claim.title}
        </Link>
      </h2>
      <EvidenceBar counts={countPositions(claim.evidence)} />
    </article>
  );
}
