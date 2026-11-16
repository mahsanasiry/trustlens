'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import {
  createEvidence,
  proposeRevision,
  updateEvidence,
} from '@/app/[locale]/studio/actions';
import { ActionToast } from '@/components/action-toast';
import { TextField } from '@/components/auth/text-field';
import { ProposalFields } from '@/components/studio/proposal-fields';
import type { EvidenceRecord, PickableSource } from '@/lib/data/authoring';
import type { StudioState } from '@/lib/data/studio-params';
import { evidencePositions } from '@/lib/domain/enums';

interface EvidenceFormProps {
  locale: string;
  /** The claim a new item is for. An existing item already knows its claim. */
  claimId: string;
  evidence: EvidenceRecord | null;
  sources: PickableSource[];
  editable: boolean;
  /** The evidence is published, so a save sends a change for review. */
  proposal?: boolean;
}

const idle: StudioState = { id: 0, status: 'idle' };

export function EvidenceForm({
  locale,
  claimId,
  evidence,
  sources,
  editable,
  proposal = false,
}: EvidenceFormProps) {
  const t = useTranslations('authoring');
  const tStudio = useTranslations('studio');
  const tReview = useTranslations('review.fields');
  const tClaims = useTranslations('claims.detail');
  const tPositions = useTranslations('evidence.positions');
  const tProposal = useTranslations('authoring.proposal');
  const [state, formAction, pending] = useActionState(
    proposal ? proposeRevision : evidence ? updateEvidence : createEvidence,
    idle,
  );

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
        <input type="hidden" name="claim_id" value={claimId} />
        {evidence ? <input type="hidden" name="id" value={evidence.id} /> : null}

        <fieldset
          disabled={(!editable && !proposal) || pending}
          className="studio-form__fields"
        >
          <legend className="visually-hidden">{t('evidence.legend')}</legend>

          <div className="field">
            <label htmlFor="evidence-source">{t('fields.source')}</label>
            <select
              id="evidence-source"
              name="source_id"
              required
              aria-describedby="evidence-source-hint"
              defaultValue={value('source_id', evidence?.source_id ?? '')}
            >
              <option value="" disabled>
                {t('fields.pickSource')}
              </option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title} ({source.publisher})
                </option>
              ))}
            </select>
            <p id="evidence-source-hint" className="field__hint">
              {t('hints.source')}
            </p>
          </div>

          <TextField
            id="evidence-title"
            name="title"
            label={tStudio('fields.sourceTitle')}
            required
            minLength={3}
            maxLength={300}
            defaultValue={value('title', evidence?.title ?? '')}
            dir="auto"
          />

          <div className="field">
            <label htmlFor="evidence-position">{tReview('position')}</label>
            <select
              id="evidence-position"
              name="position"
              required
              defaultValue={value('position', evidence?.position ?? 'supports')}
            >
              {evidencePositions.map((position) => (
                <option key={position} value={position}>
                  {tPositions(position)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="evidence-summary">{tReview('summary')}</label>
            <textarea
              id="evidence-summary"
              name="summary"
              rows={5}
              required
              maxLength={5000}
              aria-describedby="evidence-summary-hint"
              defaultValue={value('summary', evidence?.summary ?? '')}
              dir="auto"
            />
            <p id="evidence-summary-hint" className="field__hint">
              {t('hints.summary')}
            </p>
          </div>

          <div className="field">
            <label htmlFor="evidence-limitations">{tClaims('limitations')}</label>
            <textarea
              id="evidence-limitations"
              name="limitations"
              rows={3}
              maxLength={3000}
              aria-describedby="evidence-limitations-hint"
              defaultValue={value('limitations', evidence?.limitations ?? '')}
              dir="auto"
            />
            <p id="evidence-limitations-hint" className="field__hint">
              {t('hints.limitations')}
            </p>
          </div>

          <div className="field">
            <label htmlFor="evidence-note">{tClaims('researcherNote')}</label>
            <textarea
              id="evidence-note"
              name="researcher_note"
              rows={3}
              maxLength={3000}
              defaultValue={value('researcher_note', evidence?.researcher_note ?? '')}
              dir="auto"
            />
          </div>

          {proposal ? (
            <ProposalFields kind="evidence" summary={value('change_summary', '')} />
          ) : null}
        </fieldset>

        {editable || proposal ? (
          <div className="studio-form__actions">
            <button type="submit" className="btn btn--primary" disabled={pending}>
              {proposal
                ? tProposal('submit')
                : evidence
                  ? tStudio('actions.save')
                  : tStudio('actions.createDraft')}
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
