import { useTranslations } from 'next-intl';
import { FieldValueView } from '@/components/review/field-value';
import type { ReviewDetail } from '@/lib/data/review';

export function SubjectView({ detail }: { detail: ReviewDetail }) {
  const t = useTranslations();
  const tReview = useTranslations('review');

  if (detail.targetType === 'revision') {
    if (detail.changes.length === 0) {
      return <p className="work-list__empty">{tReview('noChanges')}</p>;
    }
    return (
      <div className="review-changes">
        {detail.changes.map((change) => (
          <section key={change.label} className="review-change">
            <h3 className="review-change__label">{t(change.label)}</h3>
            <div className="review-change__pair">
              <div className="review-change__side">
                <p className="review-change__caption">{tReview('current')}</p>
                <div className="review-change__value">
                  <FieldValueView value={change.before} />
                </div>
              </div>
              <div className="review-change__side review-change__side--after">
                <p className="review-change__caption">{tReview('proposed')}</p>
                <div className="review-change__value">
                  <FieldValueView value={change.after} />
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <dl className="review-fields">
      {detail.entries.map((entry, index) => (
        <div key={`${entry.label}-${index}`} className="review-fields__row">
          <dt>{t(entry.label)}</dt>
          <dd>
            <FieldValueView value={entry.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
