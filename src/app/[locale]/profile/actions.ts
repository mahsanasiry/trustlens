'use server';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import {
  parseProfileForm,
  type ProfileError,
  type ProfileState,
} from '@/lib/data/profile-params';
import { redirect } from '@/lib/i18n/navigation';
import {
  avatarBucket,
  avatarMaxBytes,
  avatarObjectPath,
  detectAvatarType,
} from '@/lib/storage/avatar';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// A form action, so the profile can be edited without scripts. Problems the
// reader can fix are returned as a state the form words in their language.
export async function updateProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const input = parseProfileForm(formData);
  if (!input) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale: input.locale });

  const id = Date.now();
  const fail = (error: ProfileError): ProfileState => ({ id, status: 'error', error });
  const done = (message: 'saved' | 'removed'): ProfileState => {
    // The header lives in the layout, which the browser keeps between pages; without
    // this it would go on showing the old name and picture until a full reload.
    revalidatePath('/', 'layout');
    return { id, status: 'saved', message };
  };

  const supabase = await createServerSupabaseClient();
  const storage = supabase.storage.from(avatarBucket);
  const previous = session.avatarPath;

  if (input.intent === 'remove') {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_path: null })
      .eq('id', session.actor.id);
    if (error) return fail('failed');
    // The row no longer points at the file, so a failed delete only leaves an
    // unused file behind.
    if (previous) await storage.remove([previous]);
    return done('removed');
  }

  if (!input.displayName) return fail('name');

  let path: string | null = null;
  if (input.file) {
    if (input.file.size > avatarMaxBytes) return fail('size');

    const bytes = new Uint8Array(await input.file.arrayBuffer());
    const type = detectAvatarType(bytes);
    if (!type) return fail('type');

    path = avatarObjectPath(session.actor.id, type, Date.now());
    const { error } = await storage.upload(path, bytes, { contentType: type });
    if (error) return fail('failed');
  }

  const { error } = await supabase
    .from('profiles')
    .update(
      path
        ? { display_name: input.displayName, avatar_path: path }
        : { display_name: input.displayName },
    )
    .eq('id', session.actor.id);

  if (error) {
    if (path) await storage.remove([path]);
    return fail('failed');
  }

  if (path && previous) await storage.remove([previous]);
  return done('saved');
}
