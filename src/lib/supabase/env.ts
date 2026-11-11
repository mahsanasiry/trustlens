import { z } from 'zod';

const supabaseEnvSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

// The public values must be read as literal property accesses so that the
// bundler can inline them into the browser build.
function readRaw() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function readSupabaseEnv(): SupabaseEnv | null {
  const parsed = supabaseEnvSchema.safeParse(readRaw());
  return parsed.success ? parsed.data : null;
}

export function getSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.local and fill in the values.',
    );
  }
  return env;
}
