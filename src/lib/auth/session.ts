import { cache } from 'react';
import { z } from 'zod';
import { appRoles } from '@/lib/domain/enums';
import { type Actor } from '@/lib/permissions';
import { readSupabaseEnv } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const profileSchema = z.object({
  display_name: z.string(),
  role: z.enum(appRoles),
});

export interface Session {
  readonly actor: NonNullable<Actor>;
  readonly displayName: string;
}

// getUser() validates the token with the auth server on every call, which is
// what makes the result safe to authorize with. The cache() wrapper keeps it
// to one round trip per request.
export const getSession = cache(async (): Promise<Session | null> => {
  if (!readSupabaseEnv()) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: row } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', data.user.id)
    .maybeSingle();

  const profile = profileSchema.safeParse(row);
  if (!profile.success) return null;

  return {
    actor: { id: data.user.id, role: profile.data.role },
    displayName: profile.data.display_name,
  };
});

export async function getActor(): Promise<Actor> {
  return (await getSession())?.actor ?? null;
}
