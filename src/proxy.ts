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

  if (env) {
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
