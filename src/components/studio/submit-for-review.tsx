'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { submitForReview } from '@/app/[locale]/studio/actions';
import { ActionToast } from '@/components/action-toast';
import type { StudioState } from '@/lib/data/studio-params';
import type { ContentEntity } from '@/lib/domain/enums';

interface SubmitForReviewProps {
  locale: string;
  kind: ContentEntity;
  id: string;
}

const idle: StudioState = { id: 0, status: 'idle' };

export function SubmitForReview({ locale, kind, id }: SubmitForReviewProps) {
  const t = useTranslations('studio');
  const [state, formAction, pending] = useActionState(submitForReview, idle);

  const outcome =
    state.status === 'saved'
      ? { tone: 'success' as const, title: t(`toast.${state.message}`) }
      : state.status === 'error'
        ? { tone: 'error' as const, title: t(`errors.${state.error}`) }
        : null;

  return (
    <>
      <form action={formAction} className="card studio-submit">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <div>
          <h2 className="studio-submit__title">{t('submit.title')}</h2>
          <p className="studio-submit__body">{t('submit.body')}</p>
        </div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {t('actions.submit')}
        </button>
      </form>

      <ActionToast
        resultId={state.id}
        pendingTitle={pending ? t('toast.submitting') : null}
        outcome={outcome}
        closeLabel={t('toast.close')}
      />
    </>
  );
}
