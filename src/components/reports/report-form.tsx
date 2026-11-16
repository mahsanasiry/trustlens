'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { submitReport } from '@/app/[locale]/reports/actions';
import { ActionToast } from '@/components/action-toast';
import { TextField } from '@/components/auth/text-field';
import type { ReportState, ReportTarget } from '@/lib/data/report-params';
import { reportKinds } from '@/lib/domain/enums';
import { Link } from '@/lib/i18n/navigation';

interface ReportFormProps {
  locale: string;
  targetType: ReportTarget;
  targetId: string;
}

const idle: ReportState = { id: 0, status: 'idle' };

export function ReportForm({ locale, targetType, targetId }: ReportFormProps) {
  const t = useTranslations('reports');
  const tKinds = useTranslations('review.reportKinds');
  const tStudio = useTranslations('studio');
  const [state, formAction, pending] = useActionState(submitReport, idle);

  const values = state.status === 'error' ? state.values : null;
  const value = (name: string, fallback: string) => values?.[name] ?? fallback;

  const outcome =
    state.status === 'sent'
      ? { tone: 'success' as const, title: t('toast.sent') }
      : state.status === 'error'
        ? { tone: 'error' as const, title: t(`errors.${state.error}`) }
        : null;

  return (
    <>
      <details
        className="report-box"
        open={
          state.status === 'error' ? true : state.status === 'sent' ? false : undefined
        }
      >
        <summary className="report-box__summary">{t('form.open')}</summary>

        <form action={formAction} className="report-box__form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />

          <p className="report-box__lead">{t('form.lead')}</p>

          <fieldset disabled={pending} className="studio-form__fields">
            <legend className="visually-hidden">{t('form.open')}</legend>

            <div className="field">
              <label htmlFor={`report-kind-${targetId}`}>{t('form.kind')}</label>
              <select
                id={`report-kind-${targetId}`}
                name="kind"
                required
                defaultValue={value('kind', 'incorrect_information')}
              >
                {reportKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {tKinds(kind)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={`report-reason-${targetId}`}>{t('form.reason')}</label>
              <textarea
                id={`report-reason-${targetId}`}
                name="reason"
                rows={4}
                required
                minLength={3}
                maxLength={2000}
                aria-describedby={`report-reason-hint-${targetId}`}
                defaultValue={value('reason', '')}
                dir="auto"
              />
              <p id={`report-reason-hint-${targetId}`} className="field__hint">
                {t('form.reasonHint')}
              </p>
            </div>

            <TextField
              id={`report-url-${targetId}`}
              name="suggested_url"
              type="url"
              inputMode="url"
              label={t('form.url')}
              maxLength={2048}
              defaultValue={value('suggested_url', '')}
              dir="ltr"
            />
          </fieldset>

          <div className="studio-form__actions">
            <button type="submit" className="btn btn--primary" disabled={pending}>
              {t('form.submit')}
            </button>
            <Link href="/reports" className="btn btn--quiet">
              {t('form.viewAll')}
            </Link>
          </div>
        </form>
      </details>

      <ActionToast
        resultId={state.id}
        pendingTitle={pending ? t('toast.sending') : null}
        outcome={outcome}
        closeLabel={tStudio('toast.close')}
      />
    </>
  );
}
