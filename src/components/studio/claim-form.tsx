'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { createClaim, proposeRevision, updateClaim } from '@/app/[locale]/studio/actions';
import { ActionToast } from '@/components/action-toast';
import { TextField } from '@/components/auth/text-field';
import { LanguageSelect } from '@/components/studio/language-select';
import { ProposalFields } from '@/components/studio/proposal-fields';
import type { ClaimRecord } from '@/lib/data/studio';
import type { StudioState } from '@/lib/data/studio-params';
import { claimCategories } from '@/lib/domain/enums';

interface ClaimFormProps {
  locale: string;
  claim: ClaimRecord | null;
  /** False once the claim is in review or published. */
  editable: boolean;
  /** The claim is published, so a save sends a change for review. */
  proposal?: boolean;
}

const idle: StudioState = { id: 0, status: 'idle' };

export function ClaimForm({ locale, claim, editable, proposal = false }: ClaimFormProps) {
  const t = useTranslations('studio');
  const tCategory = useTranslations('claims.category');
  const tProposal = useTranslations('authoring.proposal');
  const [state, formAction, pending] = useActionState(
    proposal ? proposeRevision : claim ? updateClaim : createClaim,
    idle,
  );

  // What the person typed wins over the saved record after a failed save.
  const values =
    state.status === 'error' || state.status === 'duplicate' ? state.values : null;
  const value = (name: string, fallback: string) => values?.[name] ?? fallback;

  const outcome =
    state.status === 'saved'
      ? { tone: 'success' as const, title: t(`toast.${state.message}`) }
      : state.status === 'error'
        ? { tone: 'error' as const, title: t(`errors.${state.error}`) }
        : null;

  return (
    <>
      <form action={formAction} className="card studio-form">
        <input type="hidden" name="locale" value={locale} />
        {claim ? <input type="hidden" name="id" value={claim.id} /> : null}

        <fieldset
          disabled={(!editable && !proposal) || pending}
          className="studio-form__fields"
        >
          <legend className="visually-hidden">{t('claim.legend')}</legend>

          <TextField
            id="claim-title"
            name="title"
            label={t('fields.claimTitle')}
            hint={t('hints.claimTitle')}
            required
            minLength={3}
            maxLength={300}
            defaultValue={value('title', claim?.title ?? '')}
            dir="auto"
          />

          <div className="field">
            <label htmlFor="claim-description">{t('fields.description')}</label>
            <textarea
              id="claim-description"
              name="description"
              rows={5}
              maxLength={5000}
              defaultValue={value('description', claim?.description ?? '')}
              dir="auto"
            />
          </div>

          <div className="studio-form__row">
            <div className="field">
              <label htmlFor="claim-category">{t('fields.category')}</label>
              <select
                id="claim-category"
                name="category"
                required
                defaultValue={value('category', claim?.category ?? 'science')}
              >
                {claimCategories.map((category) => (
                  <option key={category} value={category}>
                    {tCategory(category)}
                  </option>
                ))}
              </select>
            </div>
            <LanguageSelect
              id="claim-language"
              label={t('fields.language')}
              defaultValue={value('language', claim?.language ?? locale)}
            />
          </div>

          <TextField
            id="claim-origin"
            name="origin"
            label={t('fields.origin')}
            hint={t('hints.origin')}
            maxLength={1000}
            defaultValue={value('origin', claim?.origin ?? '')}
            dir="auto"
          />

          <div className="studio-form__row">
            <TextField
              id="claim-origin-url"
              name="origin_url"
              type="url"
              inputMode="url"
              label={t('fields.originUrl')}
              maxLength={2048}
              defaultValue={value('origin_url', claim?.origin_url ?? '')}
              dir="ltr"
            />
            <TextField
              id="claim-first-appeared"
              name="first_appeared_on"
              type="date"
              label={t('fields.firstAppearedOn')}
              defaultValue={value('first_appeared_on', claim?.first_appeared_on ?? '')}
            />
          </div>

          <TextField
            id="claim-keywords"
            name="keywords"
            label={t('fields.keywords')}
            hint={t('hints.keywords')}
            defaultValue={value('keywords', claim?.keywords.join(', ') ?? '')}
            dir="auto"
          />

          {proposal ? (
            <ProposalFields kind="claim" summary={value('change_summary', '')} />
          ) : null}
        </fieldset>

        {editable || proposal ? (
          <div className="studio-form__actions">
            <button type="submit" className="btn btn--primary" disabled={pending}>
              {proposal
                ? tProposal('submit')
                : claim
                  ? t('actions.save')
                  : t('actions.createDraft')}
            </button>
          </div>
        ) : null}
      </form>

      <ActionToast
        resultId={state.id}
        pendingTitle={pending ? t('toast.saving') : null}
        outcome={outcome}
        closeLabel={t('toast.close')}
      />
    </>
  );
}
