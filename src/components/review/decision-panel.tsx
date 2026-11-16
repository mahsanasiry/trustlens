'use client';

import { useTranslations } from 'next-intl';
import { useActionState, type ReactNode } from 'react';
import { reviewItem } from '@/app/[locale]/review/actions';
import { ActionToast } from '@/components/action-toast';
import { decisionsFor, type ReviewState } from '@/lib/data/review-params';
import type { ReviewTarget } from '@/lib/domain/enums';

export type Holder = 'nobody' | 'you' | 'someone';

interface DecisionPanelProps {
  locale: string;
  itemId: string;
  targetType: ReviewTarget;
  decided: boolean;
  holder: Holder;
  holderName: string | null;
  /** The reviewer sent this in themselves, so someone else has to approve it. */
  ownSubmission: boolean;
  /** The decision summary, shown once the item is decided. */
  summary: ReactNode;
}

const idle: ReviewState = { id: 0, status: 'idle' };

const decisionLabel = {
  approved: { item: 'actions.approve', report: 'actions.accept' },
  changes_requested: { item: 'actions.requestChanges', report: 'actions.requestChanges' },
  rejected: { item: 'actions.reject', report: 'actions.dismiss' },
} as const;

const decisionClass = {
  approved: 'btn btn--primary',
  changes_requested: 'btn',
  rejected: 'btn btn--danger',
} as const;

export function DecisionPanel({
  locale,
  itemId,
  targetType,
  decided,
  holder,
  holderName,
  ownSubmission,
  summary,
}: DecisionPanelProps) {
  const t = useTranslations('review');
  const tStudio = useTranslations('studio');
  const [state, formAction, pending] = useActionState(reviewItem, idle);

  const outcome =
    state.status === 'done'
      ? { tone: 'success' as const, title: t(`toast.${state.message}`) }
      : state.status === 'error'
        ? { tone: 'error' as const, title: t(`errors.${state.error}`) }
        : null;

  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={itemId} />
    </>
  );

  return (
    <>
      <section className="card review-panel" aria-labelledby="review-panel-title">
        <h2 id="review-panel-title" className="review-panel__title">
          {t('panel.title')}
        </h2>

        {decided ? (
          summary
        ) : holder === 'someone' ? (
          <p className="review-panel__note">
            {t('panel.heldElsewhere', { name: holderName ?? t('unknown') })}
          </p>
        ) : holder === 'nobody' ? (
          <form action={formAction} className="review-panel__form">
            {hidden}
            <p className="review-panel__note">{t('panel.takeFirst')}</p>
            <div>
              <button
                type="submit"
                name="intent"
                value="take"
                className="btn btn--primary"
                disabled={pending}
              >
                {t('actions.take')}
              </button>
            </div>
          </form>
        ) : (
          <form action={formAction} className="review-panel__form">
            {hidden}
            <div className="field">
              <label htmlFor="review-reason">{t('panel.reason')}</label>
              <textarea
                id="review-reason"
                name="reason"
                rows={4}
                maxLength={1000}
                defaultValue={state.status === 'error' ? state.reason : ''}
                aria-describedby="review-reason-hint"
                disabled={pending}
              />
              <p id="review-reason-hint" className="field__hint">
                {t('panel.reasonHint')}
              </p>
            </div>

            {ownSubmission ? (
              <p className="review-panel__note">{t('panel.ownSubmission')}</p>
            ) : null}

            <div className="review-panel__actions">
              {decisionsFor(targetType).map((decision) => {
                const labelKey =
                  decisionLabel[decision][targetType === 'report' ? 'report' : 'item'];
                return (
                  <button
                    key={decision}
                    type="submit"
                    name="intent"
                    value={decision}
                    className={decisionClass[decision]}
                    disabled={pending || (decision === 'approved' && ownSubmission)}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
              <button
                type="submit"
                name="intent"
                value="release"
                className="btn btn--quiet"
                disabled={pending}
                formNoValidate
              >
                {t('actions.release')}
              </button>
            </div>
          </form>
        )}
      </section>

      <ActionToast
        resultId={state.id}
        pendingTitle={pending ? t('toast.working') : null}
        outcome={outcome}
        closeLabel={tStudio('toast.close')}
      />
    </>
  );
}
