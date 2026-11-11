'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

export function SignOutButton() {
  const t = useTranslations('auth');
  const router = useRouter();

  async function signOut() {
    await createBrowserSupabaseClient().auth.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="btn btn--quiet btn--small"
    >
      {t('nav.signOut')}
    </button>
  );
}
