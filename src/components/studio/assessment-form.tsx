'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { saveAssessment } from '@/app/[locale]/studio/actions';
import { ActionToast } from '@/components/action-toast';
import type { AssessmentRecord } from '@/lib/data/authoring';
import type { StudioState } from '@/lib/data/studio-params';
import { criterionStatuses, type AssessmentCriterion } from '@/lib/domain/enums';

interface AssessmentFormProps {
  locale: string;
  sourceId: string;
  criterion: AssessmentCriterion;
  assessment: AssessmentRecord | null;
  editable: boolean;
}

const idle: StudioState = { id: 0, status: 'idle' };

export function AssessmentForm({
  locale,
  sourceId,
  criterion,
  assessment,
  editable,
}: AssessmentFormProps) {
  const t = useTranslations('authoring');
  const tStudio = useTranslations('studio');
  const tReview = useTranslations('review.fields');
  const tStatus = useTranslations('sources.criterionStatus');
  const [state, formAction, pending] = useActionState(saveAssessment, idle);

  const values = state.status === 'error' ? state.values : null;
  const value = (name: string, fallback: string) => values?.[name] ?? fallback;

  const outcome =
    state.status === 'saved'
      ? { tone: 'success' as const, title: tStudio(`toast.${state.message}`) }
      : state.status === 'error'
        ? { tone: 'error' as const, title: tStudio(`errors.${state.error}`) }
        : null;

  return (
    <>
      <form action={formAction} className="card studio-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="source_id" value={sourceId} />
        <input type="hidden" name="criterion" value={criterion} />
        {assessment ? <input type="hidden" name="id" value={assessment.id} /> : null}

        <fieldset disabled={!editable || pending} className="studio-form__fields">
          <legend className="visually-hidden">{t('checks.legend')}</legend>

          <div className="field">
            <label htmlFor="check-status">{tReview('status')}</label>
            <select
              id="check-status"
              name="status"
              required
              defaultValue={value('status', assessment?.status ?? 'not_verified')}
            >
              {criterionStatuses.map((status) => (
                <option key={status} value={status}>
                  {tStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="check-notes">{tReview('notes')}</label>
            <textarea
              id="check-notes"
              name="notes"
              rows={5}
              maxLength={3000}
              defaultValue={value('notes', assessment?.notes ?? '')}
              dir="auto"
            />
          </div>
        </fieldset>

        {editable ? (
          <div className="studio-form__actions">
            <button type="submit" className="btn btn--primary" disabled={pending}>
              {assessment ? tStudio('actions.save') : tStudio('actions.createDraft')}
            </button>
          </div>
        ) : null}
      </form>

      <ActionToast
        resultId={state.id}
        pendingTitle={pending ? tStudio('toast.saving') : null}
        outcome={outcome}
        closeLabel={tStudio('toast.close')}
      />
    </>
  );
}
