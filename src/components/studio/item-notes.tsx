import { useTranslations } from 'next-intl';
import type { LatestDecision } from '@/lib/data/studio';
import type { ContentEntity, ContentState } from '@/lib/domain/enums';
import { Link } from '@/lib/i18n/navigation';

interface ItemNotesProps {
  kind: ContentEntity;
  id: string;
  state: ContentState;
  decision: LatestDecision | null;
}

// Says where the item stands and what the author can do about it. A reviewer's
// reason is shown whenever one exists for the current state.
export function ItemNotes({ kind, id, state, decision }: ItemNotesProps) {
  const t = useTranslations('studio');
  const reason =
    decision?.reason && (state === 'changes_requested' || state === 'rejected')
      ? decision.reason
      : null;

  return (
    <div className="studio-notes">
      <p className="studio-notes__line">{t(`note.${state}`)}</p>
      {reason ? (
        <blockquote className="review-note">
          <p className="review-note__label">{t('reviewerNote')}</p>
          <p dir="auto">{reason}</p>
        </blockquote>
      ) : null}
      {state === 'published' && (kind === 'claim' || kind === 'source') ? (
        <p>
          <Link href={kind === 'claim' ? `/claims/${id}` : `/sources/${id}`}>
            {t('viewPublic')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
