import { useLocale, useTranslations } from 'next-intl';
import { setBookmark } from '@/app/[locale]/bookmarks/actions';
import type { BookmarkKind } from '@/lib/data/bookmark-params';
import { Link } from '@/lib/i18n/navigation';

interface BookmarkButtonProps {
  kind: BookmarkKind;
  id: string;
  saved: boolean;
  signedIn: boolean;
  /** Where to land after the form is submitted, without the locale prefix. */
  next: string;
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

// The form posts to a server action, so saving works without scripts.
export function BookmarkButton({ kind, id, saved, signedIn, next }: BookmarkButtonProps) {
  const t = useTranslations('bookmarks');
  const locale = useLocale();

  if (!signedIn) {
    return (
      <Link href="/sign-in" className="btn btn--quiet btn--small bookmark-button">
        <BookmarkIcon filled={false} />
        {t('signInToSave')}
      </Link>
    );
  }

  return (
    <form action={setBookmark} className="bookmark-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={saved ? 'remove' : 'save'} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="btn btn--quiet btn--small bookmark-button">
        <BookmarkIcon filled={saved} />
        {saved ? t('remove') : t('save')}
      </button>
    </form>
  );
}
