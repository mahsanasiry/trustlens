'use server';

import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { parseBookmarkForm } from '@/lib/data/bookmark-params';
import { bookmarkColumn } from '@/lib/data/bookmarks';
import { withRemoved } from '@/lib/data/undo-params';
import { redirect } from '@/lib/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const uniqueViolation = '23505';
const insufficientPrivilege = '42501';

// Used as a form action, so saving works without scripts: the browser posts the
// form and is sent back to the page it came from.
export async function setBookmark(formData: FormData): Promise<void> {
  const input = parseBookmarkForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const supabase = await createServerSupabaseClient();
  const column = bookmarkColumn(input.kind);

  if (input.intent === 'save') {
    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: session.actor.id, [column]: input.id });
    // Saving something already saved is a repeat click, not a failure.
    if (error && error.code !== uniqueViolation) {
      // Row-level security refuses a target the reader cannot see.
      if (error.code === insufficientPrivilege) notFound();
      throw new Error(`Could not save the bookmark: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', session.actor.id)
      .eq(column, input.id);
    if (error) throw new Error(`Could not remove the bookmark: ${error.message}`);
  }

  const href =
    input.intent === 'remove'
      ? withRemoved(input.next, { kind: input.kind, id: input.id })
      : input.next;
  return redirect({ href, locale: input.locale });
}
