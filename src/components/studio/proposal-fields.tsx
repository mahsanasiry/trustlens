import { useTranslations } from 'next-intl';
import type { ContentEntity } from '@/lib/domain/enums';

interface ProposalFieldsProps {
  kind: ContentEntity;
  /** What the person wrote before a failed send, so it is not lost. */
  summary: string;
}

// Added to a form when the item is already published: the edit becomes a proposal
// that an admin reviews, and the author says what changed and why.
export function ProposalFields({ kind, summary }: ProposalFieldsProps) {
  const t = useTranslations('authoring.proposal');

  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <p className="studio-section__lead">{t('lead')}</p>
      <div className="field">
        <label htmlFor="proposal-summary">{t('summary')}</label>
        <textarea
          id="proposal-summary"
          name="change_summary"
          rows={3}
          required
          minLength={3}
          maxLength={500}
          aria-describedby="proposal-summary-hint"
          defaultValue={summary}
          dir="auto"
        />
        <p id="proposal-summary-hint" className="field__hint">
          {t('summaryHint')}
        </p>
      </div>
    </>
  );
}
