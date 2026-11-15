import { useTranslations } from 'next-intl';
import {
  editableVisibilities,
  type EditableVisibility,
} from '@/lib/data/collection-params';

interface CollectionFieldsProps {
  idPrefix: string;
  defaults?: {
    title: string;
    description: string;
    visibility: EditableVisibility;
  };
}

export function CollectionFields({ idPrefix, defaults }: CollectionFieldsProps) {
  const t = useTranslations('collections');

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>{t('fields.title')}</label>
        <input
          id={`${idPrefix}-title`}
          name="title"
          required
          maxLength={120}
          // A title of only spaces passes "required", so ask for one real character.
          pattern=".*\S.*"
          defaultValue={defaults?.title}
          dir="auto"
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-description`}>{t('fields.description')}</label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={defaults?.description}
          dir="auto"
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-visibility`}>{t('fields.visibility')}</label>
        <select
          id={`${idPrefix}-visibility`}
          name="visibility"
          defaultValue={defaults?.visibility ?? 'private'}
        >
          {editableVisibilities.map((visibility) => (
            <option key={visibility} value={visibility}>
              {t(`visibility.${visibility}`)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
