'use server';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import {
  parseDecision,
  type ReviewError,
  type ReviewState,
} from '@/lib/data/review-params';
import { readEntityId, readLocale } from '@/lib/data/studio-params';
import { redirect } from '@/lib/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// One action serves every button on the decision panel. The database decides
// who may do what; these checks only give a readable answer first.

const failure = (error: ReviewError, form: FormData): ReviewState => {
  const reason = form.get('reason');
  return {
    id: Date.now(),
    status: 'error',
    error,
    reason: typeof reason === 'string' ? reason : '',
  };
};

function errorFor(code: string | undefined): ReviewError {
  if (code === '42501') return 'forbidden';
  if (code === '55006') return 'taken';
  if (code === '22023') return 'blocked';
  return 'failed';
}

const done = (message: 'taken' | 'released' | 'decided'): ReviewState => {
  // The queue, the header and the author's studio all show this item.
  revalidatePath('/', 'layout');
  return { id: Date.now(), status: 'done', message };
};

export async function reviewItem(
  _previous: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const locale = readLocale(form);
  const id = readEntityId(form);
  if (!locale || !id) notFound();

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role !== 'admin') return failure('forbidden', form);

  const supabase = await createServerSupabaseClient();
  const intent = form.get('intent');

  if (intent === 'take') {
    const { error } = await supabase.rpc('claim_review_item', { p_item_id: id });
    return error ? failure(errorFor(error.code), form) : done('taken');
  }

  if (intent === 'release') {
    const { error } = await supabase.rpc('release_review_item', { p_item_id: id });
    return error ? failure(errorFor(error.code), form) : done('released');
  }

  const input = parseDecision(intent, form.get('reason'));
  if (!input.ok) return failure(input.error, form);

  const { error } = await supabase.rpc('decide_review', {
    p_item_id: id,
    p_decision: input.decision,
    p_reason: input.reason,
  });
  return error ? failure(errorFor(error.code), form) : done('decided');
}
