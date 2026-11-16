import { useLocale, useTranslations } from 'next-intl';

interface UndoNoticeProps {
  message: string;
  /** The server action that puts the item back. */
  action: (formData: FormData) => void | Promise<void>;
  /** The form fields that action reads, besides the locale. */
  fields: Record<string, string>;
}

// A plain form, so Undo works without scripts, like the removal it reverses.
export function UndoNotice({ message, action, fields }: UndoNoticeProps) {
  const t = useTranslations('common');
  const locale = useLocale();

  return (
    <div role="status" className="undo-notice">
      <div className="container undo-notice__inner">
        <p className="undo-notice__message">{message}</p>
        <form action={action}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn--small">
            {t('undo')}
          </button>
        </form>
      </div>
    </div>
  );
}
