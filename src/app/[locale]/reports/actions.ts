'use server';

import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import {
  parseReport,
  type ReportError,
  type ReportState,
} from '@/lib/data/report-params';
import { echoValues, readLocale } from '@/lib/data/studio-params';
import { redirect } from '@/lib/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const failure = (error: ReportError, form: FormData): ReportState => ({
  id: Date.now(),
  status: 'error',
  error,
  values: echoValues(form),
});

function errorFor(code: string | undefined): ReportError {
  // 23505: the same open report already exists. 53400: the daily limit is reached.
  // 42501: the item is not visible to this reader.
  if (code === '23505') return 'duplicate';
  if (code === '53400') return 'limit';
  if (code === '42501') return 'forbidden';
  return 'failed';
}

export async function submitReport(
  _previous: ReportState,
  form: FormData,
): Promise<ReportState> {
  const locale = readLocale(form);
  if (!locale) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });

  const input = parseReport(form);
  if (!input) return failure('invalid', form);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('reports')
    .insert({ ...input, user_id: session.actor.id });
  if (error) return failure(errorFor(error.code), form);

  return { id: Date.now(), status: 'sent' };
}
