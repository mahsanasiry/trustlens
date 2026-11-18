import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from '@/lib/i18n/routing';
import { readSupabaseEnv } from '@/lib/supabase/env';

const handleI18nRouting = createIntlMiddleware(routing);

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export default async function proxy(request: NextRequest) {
  const pending: CookieToSet[] = [];
  const env = readSupabaseEnv();
  // A visitor without a session has no token to refresh, so the network call
  // and its CPU cost are skipped.
  const hasSession = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));

  if (env && hasSession) {
    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const cookie of cookiesToSet) {
            // Written to the request too, so server components in this same
            // request see the refreshed token instead of the expired one.
            request.cookies.set(cookie.name, cookie.value);
            pending.push(cookie);
          }
        },
      },
    });
    await supabase.auth.getUser();
  }

  const response = handleI18nRouting(request);
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
