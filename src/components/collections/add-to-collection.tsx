import { useLocale, useTranslations } from 'next-intl';
import { addToCollection } from '@/app/[locale]/collections/actions';
import type { BookmarkKind } from '@/lib/data/bookmark-params';
import { Link } from '@/lib/i18n/navigation';

interface AddToCollectionProps {
  kind: BookmarkKind;
  id: string;
  choices: { id: string; title: string }[];
  /** Where to land afterwards, without the locale prefix. */
  next: string;
  added: boolean;
}

export function AddToCollection({
  kind,
  id,
  choices,
  next,
  added,
}: AddToCollectionProps) {
  const t = useTranslations('collections');
  const locale = useLocale();

  return (
    <div className="add-to-collection">
      {choices.length === 0 ? (
        <p className="muted">
          {t('add.none')} <Link href="/collections">{t('create.title')}</Link>
        </p>
      ) : (
        <form action={addToCollection} className="add-to-collection__form">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="locale" value={locale} />
          <div className="field">
            <label htmlFor={`add-${kind}-${id}`}>{t('add.label')}</label>
            <select
              id={`add-${kind}-${id}`}
              name="collection_id"
              required
              defaultValue=""
            >
              <option value="" disabled>
                {t('add.choose')}
              </option>
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--quiet btn--small">
            {t('add.submit')}
          </button>
        </form>
      )}
      {added ? (
        <p className="add-to-collection__done" role="status">
          {t('add.done')}
        </p>
      ) : null}
    </div>
  );
}
