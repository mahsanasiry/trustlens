'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { createSource, updateSource } from '@/app/[locale]/studio/actions';
import { ActionToast } from '@/components/action-toast';
import { TextField } from '@/components/auth/text-field';
import { LanguageSelect } from '@/components/studio/language-select';
import type { SourceRecord } from '@/lib/data/studio';
import type { StudioState } from '@/lib/data/studio-params';
import { sourceTypes } from '@/lib/domain/enums';

interface SourceFormProps {
  locale: string;
  source: SourceRecord | null;
  editable: boolean;
}

const idle: StudioState = { id: 0, status: 'idle' };

export function SourceForm({ locale, source, editable }: SourceFormProps) {
  const t = useTranslations('studio');
  const tType = useTranslations('sources.type');
  const [state, formAction, pending] = useActionState(
    source ? updateSource : createSource,
    idle,
  );

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
        {source ? <input type="hidden" name="id" value={source.id} /> : null}

        <fieldset disabled={!editable || pending} className="studio-form__fields">
          <legend className="visually-hidden">{t('source.legend')}</legend>

          <TextField
            id="source-title"
            name="title"
            label={t('fields.sourceTitle')}
            required
            minLength={3}
            maxLength={400}
            defaultValue={value('title', source?.title ?? '')}
            dir="auto"
          />

          <div className="studio-form__row">
            <TextField
              id="source-publisher"
              name="publisher"
              label={t('fields.publisher')}
              required
              maxLength={200}
              defaultValue={value('publisher', source?.publisher ?? '')}
              dir="auto"
            />
            <div className="field">
              <label htmlFor="source-type">{t('fields.type')}</label>
              <select
                id="source-type"
                name="type"
                required
                defaultValue={value('type', source?.type ?? 'report')}
              >
                {sourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {tType(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TextField
            id="source-url"
            name="url"
            type="url"
            inputMode="url"
            label={t('fields.url')}
            required
            maxLength={2048}
            defaultValue={value('url', source?.url ?? '')}
            dir="ltr"
          />

          <div className="field">
            <label htmlFor="source-authors">{t('fields.authors')}</label>
            <textarea
              id="source-authors"
              name="authors"
              rows={3}
              aria-describedby="source-authors-hint"
              defaultValue={value('authors', source?.authors.join('\n') ?? '')}
              dir="auto"
            />
            <p id="source-authors-hint" className="field__hint">
              {t('hints.authors')}
            </p>
          </div>

          <div className="studio-form__row">
            <TextField
              id="source-published"
              name="published_on"
              type="date"
              label={t('fields.publishedOn')}
              defaultValue={value('published_on', source?.published_on ?? '')}
            />
            <TextField
              id="source-accessed"
              name="accessed_on"
              type="date"
              label={t('fields.accessedOn')}
              defaultValue={value('accessed_on', source?.accessed_on ?? '')}
            />
          </div>

          <LanguageSelect
            id="source-language"
            label={t('fields.language')}
            defaultValue={value('language', source?.language ?? locale)}
          />
        </fieldset>

        {state.status === 'duplicate' ? (
          <div role="alert" className="alert studio-duplicates">
            <h2 className="studio-duplicates__title">{t('duplicate.title')}</h2>
            <p>{t('duplicate.body')}</p>
            <ul>
              {state.matches.map((match) => (
                <li key={match.id}>
                  <span dir="auto">
                    {match.title} · {match.publisher}
                  </span>{' '}
                  <span className="tag">{t(`duplicate.reason.${match.reason}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {editable ? (
          <div className="studio-form__actions">
            <button
              type="submit"
              className={
                state.status === 'duplicate' ? 'btn btn--quiet' : 'btn btn--primary'
              }
              disabled={pending}
            >
              {source ? t('actions.save') : t('actions.createDraft')}
            </button>
            {state.status === 'duplicate' ? (
              <button
                type="submit"
                name="confirm_duplicate"
                value="yes"
                className="btn btn--primary"
                disabled={pending}
              >
                {t('duplicate.createAnyway')}
              </button>
            ) : null}
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
